import { dbConnect } from '../mongodb';
import ShopifyToken from '../models/Shopifytoken';

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_NAME;  // manha-clothing
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

export async function fetchNewToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const response = await fetch(`https://${SHOPIFY_STORE}.myshopify.com/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Token fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  // data.access_token, data.expires_in (seconds)
  const expiresIn = data.expires_in || 86400; // default 24h
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return { accessToken: data.access_token, expiresAt };
}

export async function storeToken(accessToken, expiresAt) {
  await dbConnect();
  // Delete old tokens (keep only latest)
  await ShopifyToken.deleteMany({});
  const tokenDoc = await ShopifyToken.create({
    accessToken,
    expiresAt,
    updatedAt: new Date()
  });
  return tokenDoc;
}

export async function getValidToken() {
  await dbConnect();
  let tokenDoc = await ShopifyToken.getLatestToken();
  
  // If no token or token expired (with 5 min buffer), fetch new one
  if (!tokenDoc || tokenDoc.expiresAt <= new Date(Date.now() + 5*60*1000)) {
    const { accessToken, expiresAt } = await fetchNewToken();
    await storeToken(accessToken, expiresAt);
    return accessToken;
  }
  
  return tokenDoc.accessToken;
}