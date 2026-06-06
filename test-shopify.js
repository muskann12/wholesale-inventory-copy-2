require('dotenv').config();
console.log('Store:', process.env.SHOPIFY_STORE_NAME);
console.log('Client ID (first 10 chars):', process.env.SHOPIFY_CLIENT_ID?.slice(0,10));
console.log('Secret exists:', !!process.env.SHOPIFY_CLIENT_SECRET);

const params = new URLSearchParams();
params.append('grant_type', 'client_credentials');
params.append('client_id', process.env.SHOPIFY_CLIENT_ID);
params.append('client_secret', process.env.SHOPIFY_CLIENT_SECRET);

fetch(`https://${process.env.SHOPIFY_STORE_NAME}.myshopify.com/admin/oauth/access_token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: params.toString()
})
.then(async res => {
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text.slice(0, 500));
  try {
    const json = JSON.parse(text);
    if (json.access_token) console.log('✅ Token received!');
  } catch(e) { console.log('Not JSON – likely error page'); }
})
.catch(err => console.error('Fetch error:', err));
