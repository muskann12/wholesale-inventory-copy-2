import { getValidToken } from '../../../lib/shopify/tokenManager';

export default async function handler(req, res) {
  try {
    // 1. Get a valid access token (auto‑refreshes if expired)
    const token = await getValidToken();
    
    // 2. Use the token to fetch products from Shopify (basic test)
    const shopifyRes = await fetch(
      `https://${process.env.SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2026-04/products.json?limit=1`,
      {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const shopifyData = await shopifyRes.json();
    
    // 3. Return result
    res.status(200).json({
      success: true,
      tokenPreview: token.slice(0, 10) + '…',
      shopifyResponse: shopifyData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}