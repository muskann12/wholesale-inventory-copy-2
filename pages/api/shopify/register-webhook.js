import { getValidToken } from '../../../lib/shopify/tokenManager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getValidToken();
    const store = process.env.SHOPIFY_STORE_NAME;
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/shopify/orders-create`;

    // Register the webhook
    const response = await fetch(
      `https://${store}.myshopify.com/admin/api/2026-04/webhooks.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({
          webhook: {
            topic: 'orders/create',
            address: webhookUrl,
            format: 'json',
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Webhook registration failed:', data);
      return res.status(response.status).json({
        error: 'Failed to register webhook',
        details: data.errors || data,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook registered successfully',
      webhook: data.webhook,
    });
  } catch (error) {
    console.error('Webhook registration error:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message,
    });
  }
}
