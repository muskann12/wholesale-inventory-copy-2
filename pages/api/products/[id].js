import { dbConnect } from '../../../lib/mongodb';
import Product from '../../../lib/models/Product';
import { verifyToken, getTokenFromReq } from '../../../lib/auth';
import { updateShopifyInventory, deleteShopifyProduct, updateShopifyProduct } from '../../../lib/shopify/sync';

export default async function handler(req, res) {
  await dbConnect();
  const token = getTokenFromReq(req);
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;

  if (req.method === 'PUT') {
    const updates = req.body;
    console.log('📦 Received updates:', updates);

    // Find current product before update
    const currentProduct = await Product.findById(id);
    if (!currentProduct) return res.status(404).json({ error: 'Not found' });

    // Apply updates
    const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Not found' });

    // If the product is raw cloth, skip all Shopify sync (local only)
    if (product.isRawCloth) {
      console.log('📦 Raw cloth product – no Shopify sync');
      return res.status(200).json(product);
    }

    // For non‑raw cloth products, proceed with Shopify sync
    const variantsChanged = updates.variants !== undefined;
    const nameChanged = updates.name !== undefined;
    const imageChanged = updates.imageUrl !== undefined;

    if (variantsChanged || nameChanged || imageChanged) {
      console.log('🔄 Product details changed, updating full product in Shopify...');
      updateShopifyProduct(product).catch(err => console.error('❌ Shopify full update error:', err));
    } else if (updates.variants === undefined) {
      // Legacy quantity sync – handle if needed
      if (updates.variants) {
        for (const variant of product.variants) {
          const oldVariant = currentProduct.variants.find(v => v.size === variant.size);
          if (oldVariant && oldVariant.quantity !== variant.quantity) {
            console.log(`🔄 Stock for ${variant.size} changed from ${oldVariant.quantity} to ${variant.quantity}, syncing...`);
            updateShopifyInventory(product.sku, variant.size, variant.quantity).catch(err =>
              console.error(`❌ Shopify inventory sync error for ${variant.size}:`, err)
            );
          }
        }
      }
    }

    return res.status(200).json(product);
  }

  if (req.method === 'DELETE') {
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ error: 'Not found' });

    // Only delete from Shopify if the product is not raw cloth
    if (!product.isRawCloth) {
      deleteShopifyProduct(product.sku).catch(err => console.error('Shopify delete error:', err));
    }

    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}