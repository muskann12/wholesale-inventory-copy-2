import { dbConnect } from '../../../lib/mongodb';
import Product from '../../../lib/models/Product';
import Sale from '../../../lib/models/Sale';
import { getValidToken } from '../../../lib/shopify/tokenManager';
import { verifyToken, getTokenFromReq } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const token = getTokenFromReq(req);
    if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

    const shopifyToken = await getValidToken();
    const store = process.env.SHOPIFY_STORE_NAME;

    // Fetch recent orders from Shopify
    const response = await fetch(
      `https://${store}.myshopify.com/admin/api/2026-04/orders.json?status=any&limit=50&fields=id,line_items,customer,created_at`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch Shopify orders',
        details: data.errors || data,
      });
    }

    const orders = data.orders || [];
    let importedCount = 0;
    const errors = [];

    // Process each order
    for (const order of orders) {
      try {
        // Check if order already recorded
        const existingSale = await Sale.findOne({ shopifyOrderId: order.id.toString() });
        if (existingSale) {
          continue; // Skip already imported orders
        }

        // Process line items
        for (const item of order.line_items) {
          const sku = item.sku;
          const quantity = item.quantity;
          const product = await Product.findOne({ sku });

          if (!product) {
            errors.push(`SKU ${sku} not found in inventory`);
            continue;
          }

          // Check if we need to reduce inventory
          const alreadyRecorded = await Sale.findOne({
            shopifyOrderId: order.id.toString(),
            productId: product._id,
          });

          if (!alreadyRecorded) {
            const revenue = product.sellingPrice * quantity;
            const profit = (product.sellingPrice - product.costPrice) * quantity;

            await Sale.create({
              productId: product._id,
              quantity,
              revenue,
              profit,
              source: 'shopify',
              shopifyOrderId: order.id.toString(),
              customerName: order.customer
                ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
                : 'Guest',
            });

            importedCount++;
          }
        }
      } catch (error) {
        errors.push(`Error processing order ${order.id}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${importedCount} new orders from Shopify`,
      importedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Order import error:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message,
    });
  }
}
