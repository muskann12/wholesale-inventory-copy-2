import { getValidToken } from '../../../lib/shopify/tokenManager';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getValidToken();
    const store = process.env.SHOPIFY_STORE_NAME;

    // Fetch all webhooks
    const response = await fetch(
      `https://${store}.myshopify.com/admin/api/2026-04/webhooks.json`,
      {
        headers: {
          'X-Shopify-Access-Token': token,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to fetch webhooks:', data);
      return res.status(response.status).json({
        error: 'Failed to fetch webhooks',
        details: data.errors || data,
      });
    }

    return res.status(200).json({
      success: true,
      webhooks: data.webhooks,
    });
  } catch (error) {
    console.error('Webhook fetch error:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message,
    });
  }
}
