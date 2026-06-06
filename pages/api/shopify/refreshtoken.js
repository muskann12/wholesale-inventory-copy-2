// pages/api/shopify/refreshtoken.js
import { dbConnect } from '../../../lib/mongodb';
import ShopifyToken from '@/lib/models/Shopifytoken'; 

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.SHOPIFY_CLIENT_ID);
    params.append('client_secret', process.env.SHOPIFY_CLIENT_SECRET);

    const response = await fetch(`https://${process.env.SHOPIFY_STORE_NAME}.myshopify.com/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Token fetch failed');

    const expiresIn = data.expires_in || 86400;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Delete old token and store new one
    await ShopifyToken.deleteMany({});
    await ShopifyToken.create({
      accessToken: data.access_token,
      expiresAt: expiresAt
    });

    res.status(200).json({ success: true, expiresAt });
  } catch (error) {
    console.error('Token refresh failed:', error);
    res.status(500).json({ error: error.message });
  }
}