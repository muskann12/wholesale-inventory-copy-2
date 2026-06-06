# Setting Up Shopify Webhook Integration

## Steps to Import Shopify Orders:

### Option 1: Manual Import (Quickest for Testing)
1. Make a POST request to: `POST /api/shopify/import-orders`
   - This will fetch all recent orders from Shopify and import them into your database
   - You need to be authenticated

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/shopify/import-orders \
  -H "Content-Type: application/json" \
  -H "Cookie: <your_auth_token>"
```

### Option 2: Register Webhook (For Live Sync)
1. Make a POST request to: `POST /api/shopify/register-webhook`
   - Registers the orders/create webhook with Shopify
   - Your app URL must be publicly accessible
   - Make sure `NEXT_PUBLIC_APP_URL` environment variable is set

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/shopify/register-webhook \
  -H "Content-Type: application/json"
```

### Option 3: Check Registered Webhooks
1. GET `/api/shopify/list-webhooks`
   - Shows all webhooks registered with Shopify

**Using curl:**
```bash
curl http://localhost:3000/api/shopify/list-webhooks
```

## Environment Variables Needed:
- `SHOPIFY_STORE_NAME` - Your Shopify store name (e.g., "manha-clothing")
- `SHOPIFY_CLIENT_ID` - OAuth app client ID
- `SHOPIFY_CLIENT_SECRET` - OAuth app client secret
- `NEXT_PUBLIC_APP_URL` - Your app's public URL (for webhooks)

## What Happens:
- When an order is imported, a Sale record is created with `source: 'shopify'`
- The sales page will then display these Shopify orders
- Revenue and profit are calculated based on your product's selling and cost prices
