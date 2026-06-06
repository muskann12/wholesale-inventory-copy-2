import { dbConnect } from '../../../lib/mongodb';
import Product from '../../../lib/models/Product';
import { verifyToken, getTokenFromReq } from '../../../lib/auth';
import { syncProductToShopify } from '../../../lib/shopify/sync';

export default async function handler(req, res) {
  await dbConnect();
  const token = getTokenFromReq(req);
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

  // GET – list all products
  if (req.method === 'GET') {
    const products = await Product.find({}).sort({ createdAt: -1 });
    return res.status(200).json(products);
  }

  // POST – create a new product
  if (req.method === 'POST') {
    let { name, sku, costPrice, description, images, variants } = req.body;

    // Basic validation
    if (!name || !sku) {
      return res.status(400).json({ error: 'Missing name or SKU' });
    }

    // Sanitize product-level costPrice
    const productCostPrice = (costPrice === '' || costPrice === null) ? 0 : Number(costPrice);

    // Validate variants array
    if (!variants || !Array.isArray(variants) || variants.length !== 3) {
      return res.status(400).json({ error: 'Variants must contain Small, Medium, Large' });
    }

    // Sanitize each variant
    const sanitizedVariants = variants.map(v => ({
      size: v.size,
      costPrice: (v.costPrice === '' || v.costPrice === null) ? 0 : Number(v.costPrice),
      sellingPrice: (v.sellingPrice === '' || v.sellingPrice === null) ? 0 : Number(v.sellingPrice),
      quantity: (v.quantity === '' || v.quantity === null) ? 0 : Number(v.quantity),
    }));

    // Check for duplicate SKU
    const existing = await Product.findOne({ sku });
    if (existing) return res.status(400).json({ error: 'SKU already exists' });

    // Derive legacy fields from Medium variant (for backward compatibility)
    const medium = sanitizedVariants.find(v => v.size === 'Medium');
    const sellingPrice = medium?.sellingPrice || 0;
    const quantity = medium?.quantity || 0;

    // Create product
    const product = await Product.create({
      name,
      sku,
      costPrice: productCostPrice,
      description: description || '',
      images: images || [],
      variants: sanitizedVariants,
      sellingPrice,
      quantity,
    });

    // Sync to Shopify (non‑blocking)
    syncProductToShopify(product).catch(err => console.error('Shopify sync error:', err));

    return res.status(201).json(product);
  }

  // Any other method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}