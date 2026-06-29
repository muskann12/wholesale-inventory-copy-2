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
    let { productId, size, quantity = 1, customSellingPrice, isRawCloth } = req.body;
    quantity = parseFloat(quantity) || 0;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Determine if this is a raw cloth product (either flag set)
    const raw = isRawCloth || product.isRawCloth || false;

    let sellingPrice, costPrice, finalQuantity, stockKey;

    if (raw) {
      // Raw cloth: use single fields, allow decimal quantity
      if (product.quantity < quantity) return res.status(400).json({ error: 'Insufficient stock' });
      sellingPrice = customSellingPrice && customSellingPrice > 0 ? customSellingPrice : product.sellingPrice;
      costPrice = product.costPrice;
      product.quantity -= quantity;
      await product.save();
      finalQuantity = quantity;
      stockKey = product.quantity;
      // No Shopify sync for raw cloth
    } else {
      // Normal product with variants
      if (!size) return res.status(400).json({ error: 'Size is required' });
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ error: 'Quantity must be a whole number' });
      }
      const variant = product.variants.find(v => v.size === size);
      if (!variant) return res.status(404).json({ error: `Size "${size}" not found` });
      if (variant.quantity < quantity) return res.status(400).json({ error: `Insufficient stock for size ${size}` });
      sellingPrice = customSellingPrice && customSellingPrice > 0 ? customSellingPrice : variant.sellingPrice;
      costPrice = variant.costPrice;
      variant.quantity -= quantity;
      await product.save();
      finalQuantity = quantity;
      stockKey = variant.quantity;
      // Update Shopify inventory
      updateShopifyInventory(product.sku, size, stockKey).catch(err => console.error('Shopify inventory sync error:', err));
    }

    const revenue = sellingPrice * finalQuantity;
    const profit = (sellingPrice - costPrice) * finalQuantity;

    await Sale.create({
      productId: product._id,
      size: raw ? null : size,
      quantity: finalQuantity,
      revenue,
      profit,
      source: 'physical',
      isRawCloth: raw,
    });

    return res.status(200).json({ success: true, newStock: stockKey });
  }

  // DELETE – remove a sale and restore stock
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Sale ID required' });

    const sale = await Sale.findById(id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    // Only allow deletion for physical sales
    if (sale.source !== 'physical') {
      return res.status(403).json({ error: 'Cannot delete Shopify orders from here' });
    }

    const product = await Product.findById(sale.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (sale.isRawCloth) {
      // Raw cloth: restore stock from product.quantity
      product.quantity += sale.quantity;
      await product.save();
      // No Shopify sync needed
    } else {
      // Normal product: restore variant stock
      const variant = product.variants.find(v => v.size === sale.size);
      if (variant) {
        variant.quantity += sale.quantity;
        await product.save();
        updateShopifyInventory(product.sku, sale.size, variant.quantity).catch(err =>
          console.error('Shopify inventory restore error:', err)
        );
      }
    }

    await Sale.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Sale deleted, stock restored' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}