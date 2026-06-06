import { dbConnect } from '../../../lib/mongodb';
import Product from '../../../lib/models/Product';
import Sale from '../../../lib/models/Sale';
import { verifyToken, getTokenFromReq } from '../../../lib/auth';
import { updateShopifyInventory } from '../../../lib/shopify/sync';

export default async function handler(req, res) {
  await dbConnect();
  const token = getTokenFromReq(req);
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

  // GET – list sales
  if (req.method === 'GET') {
    const { source } = req.query;
    let query = {};
    if (source && source !== 'all') query.source = source;
    const sales = await Sale.find(query)
      .populate('productId', 'name sku variants')
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(sales);
  }

  // POST – create sale (physical store)
  if (req.method === 'POST') {
    let { productId, size, quantity = 1, customSellingPrice } = req.body;
    if (!size) return res.status(400).json({ error: 'Size is required' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const variant = product.variants.find(v => v.size === size);
    if (!variant) return res.status(404).json({ error: `Size "${size}" not found` });
    if (variant.quantity < quantity) return res.status(400).json({ error: `Insufficient stock for size ${size}` });

    const sellingPrice = customSellingPrice && customSellingPrice > 0 ? customSellingPrice : variant.sellingPrice;
    const revenue = sellingPrice * quantity;
    const profit = (sellingPrice - variant.costPrice) * quantity;

    variant.quantity -= quantity;
    await product.save();

    await Sale.create({
      productId: product._id,
      size,
      quantity,
      revenue,
      profit,
      source: 'physical',
    });

    updateShopifyInventory(product.sku, size, variant.quantity).catch(err => console.error('Shopify inventory sync error:', err));

    return res.status(200).json({ success: true, newStock: variant.quantity });
  }

  // DELETE – remove a sale and restore stock
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Sale ID required' });

    const sale = await Sale.findById(id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    // Only allow deletion for physical sales (Shopify orders should not be deleted)
    if (sale.source !== 'physical') {
      return res.status(403).json({ error: 'Cannot delete Shopify orders from here' });
    }

    const product = await Product.findById(sale.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const variant = product.variants.find(v => v.size === sale.size);
    if (variant) {
      // Restore stock
      variant.quantity += sale.quantity;
      await product.save();

      // Update Shopify inventory (increase)
      updateShopifyInventory(product.sku, sale.size, variant.quantity).catch(err =>
        console.error('Shopify inventory restore error:', err)
      );
    }

    await Sale.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Sale deleted, stock restored' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}