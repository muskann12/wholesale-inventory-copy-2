import { dbConnect } from '../../../../lib/mongodb';
import Product from '../../../../lib/models/Product';
import { verifyToken, getTokenFromReq } from '../../../../lib/auth';
import { syncProductToShopify, updateShopifyProduct, updateShopifyInventory } from '../../../../lib/shopify/sync';
import { getValidToken } from '../../../../lib/shopify/tokenManager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();
  const token = getTokenFromReq(req);
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  console.log('🔍 Product before sync:', {
    name: product.name,
    sku: product.sku,
    variants: product.variants.map(v => ({ size: v.size, quantity: v.quantity })),
    shopifyInventoryItemIds: product.shopifyInventoryItemIds,
  });

  try {
    const shopifyToken = await getValidToken();
    const store = process.env.SHOPIFY_STORE_NAME;

    let result;
    if (product.shopifyProductId) {
      // Step 1: Update product details + refresh inventory_item_ids
      result = await updateShopifyProduct(product);

      // Step 2: Update inventory for each variant using inventory_item_id directly
      // product.shopifyInventoryItemIds is now populated after updateShopifyProduct
      const inventoryItemIds = product.shopifyInventoryItemIds || {};

      for (const v of product.variants) {
        const inventoryItemId = inventoryItemIds[v.size];
        if (!inventoryItemId) {
          console.warn(`⚠️ No inventory_item_id for size ${v.size}, skipping`);
          continue;
        }
        try {
          await updateShopifyInventory(inventoryItemId, v.quantity, shopifyToken, store);
          console.log(`✅ Inventory synced: ${v.size} = ${v.quantity}`);
        } catch (err) {
          console.error(`❌ Failed inventory update for ${v.size}:`, err.message);
        }
      }
    } else {
      // New product — syncProductToShopify handles initial stock via inventory_quantity
      result = await syncProductToShopify(product);

      // After creation, also force-set inventory via API to be sure
      const inventoryItemIds = product.shopifyInventoryItemIds || {};
      for (const v of product.variants) {
        const inventoryItemId = inventoryItemIds[v.size];
        if (!inventoryItemId) continue;
        try {
          await updateShopifyInventory(inventoryItemId, v.quantity, shopifyToken, store);
        } catch (err) {
          console.error(`❌ Post-create inventory update failed for ${v.size}:`, err.message);
        }
      }
    }

    return res.status(200).json({ success: true, shopifyProduct: result });
  } catch (err) {
    console.error('❌ Sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}