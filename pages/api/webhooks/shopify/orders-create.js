import { dbConnect } from '../../../../lib/mongodb';
import Product from '../../../../lib/models/Product';
import Sale from '../../../../lib/models/Sale';

// Helper to read raw body (works even if bodyParser is enabled)
const getRawBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

export default async function handler(req, res) {
  // Handle GET requests (Shopify URL verification)
  if (req.method === 'GET') {
    res.status(200).json({ ok: true });
    return;
  }

  // Only POST for webhooks
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    // Read raw body (in case bodyParser didn't populate req.body)
    const rawBody = await getRawBody(req);
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      // If raw parsing fails, try req.body (if populated)
      body = req.body;
      if (!body) {
        console.error('Failed to parse webhook body');
        res.status(400).end();
        return;
      }
    }

    const { id: shopifyOrderId, line_items, customer } = body;

    if (!line_items || !Array.isArray(line_items)) {
      console.error('Invalid webhook payload – no line_items');
      res.status(400).end();
      return;
    }

    await dbConnect();

    for (const item of line_items) {
      const sku = item.sku;
      const quantity = item.quantity;
      if (!sku) continue;

      const product = await Product.findOne({ sku });
      if (!product) {
        console.warn(`Product not found for SKU: ${sku}`);
        continue;
      }

      if (product.quantity >= quantity) {
        product.quantity -= quantity;
        await product.save();

        const revenue = product.sellingPrice * quantity;
        const profit = (product.sellingPrice - product.costPrice) * quantity;

        await Sale.create({
          productId: product._id,
          quantity,
          revenue,
          profit,
          source: 'shopify',
          shopifyOrderId,
          customerName: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Guest',
        });
      } else {
        console.error(`Insufficient stock for SKU ${sku}`);
      }
    }

    res.status(200).end();
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).end();
  }
}