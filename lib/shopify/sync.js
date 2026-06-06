import { getValidToken } from './tokenManager';

export async function syncProductToShopify(product) {
  const token = await getValidToken();
  const store = process.env.SHOPIFY_STORE_NAME;

  // Build variants array
  const shopifyVariants = product.variants.map(v => ({
    option1: v.size,
    price: v.sellingPrice.toString(),
    sku: `${product.sku}-${v.size.charAt(0)}`,
    inventory_quantity: v.quantity,
    inventory_management: 'shopify',
  }));

  // Build images array
  const images = product.images?.map(url => ({ src: url })) || [];
  if (!product.images?.length && product.imageUrl) {
    images.push({ src: product.imageUrl });
  }

  const response = await fetch(`https://${store}.myshopify.com/admin/api/2025-04/products.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({
      product: {
        title: product.name,
        body_html: product.description || `<p>SKU base: ${product.sku}</p>`,
        vendor: 'Shaukat Collection',
        product_type: 'Clothing',
        status: 'draft',              // ✅ Products are created as drafts (unpublished)
        options: [{ name: 'Size', values: ['Small', 'Medium', 'Large'] }],
        variants: shopifyVariants,
        images: images,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Shopify sync error: ${JSON.stringify(data.errors)}`);
  return data.product;
}

export async function updateShopifyProduct(product) {
  const token = await getValidToken();
  const store = process.env.SHOPIFY_STORE_NAME;

  const searchRes = await fetch(`https://${store}.myshopify.com/admin/api/2025-04/products.json?sku=${product.sku}`, {
    headers: { 'X-Shopify-Access-Token': token }
  });
  const { products } = await searchRes.json();
  if (!products.length) return await syncProductToShopify(product);

  const shopifyProductId = products[0].id;
  const existingVariants = products[0].variants;
  const updatedVariants = product.variants.map(v => {
    const existing = existingVariants.find(ev => ev.option1 === v.size);
    return {
      id: existing?.id,
      option1: v.size,
      sku: `${product.sku}-${v.size.charAt(0)}`,
      price: v.sellingPrice.toString(),
      inventory_quantity: v.quantity,
      inventory_management: 'shopify',
    };
  });

  const images = product.images?.map(url => ({ src: url })) || [];
  if (!product.images?.length && product.imageUrl) {
    images.push({ src: product.imageUrl });
  }

  const response = await fetch(`https://${store}.myshopify.com/admin/api/2025-04/products/${shopifyProductId}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({
      product: {
        id: shopifyProductId,
        title: product.name,
        body_html: product.description || `<p>SKU base: ${product.sku}</p>`,
        variants: updatedVariants,
        images: images,
        // status field omitted – preserves existing status (draft or active)
      },
    }),
  });

  if (!response.ok) throw new Error(`Shopify update failed: ${await response.text()}`);
  return response.json();
}

export async function updateShopifyInventory(baseSku, size, newQuantity) {
  const token = await getValidToken();
  const store = process.env.SHOPIFY_STORE_NAME;

  const variantSku = `${baseSku}-${size.charAt(0)}`;
  const searchRes = await fetch(`https://${store}.myshopify.com/admin/api/2025-04/products.json?sku=${variantSku}`, {
    headers: { 'X-Shopify-Access-Token': token }
  });
  const { products } = await searchRes.json();
  if (!products.length) return;

  const variant = products[0].variants.find(v => v.sku === variantSku);
  if (!variant) return;

  const inventoryItemId = variant.inventory_item_id;
  const locRes = await fetch(`https://${store}.myshopify.com/admin/api/2025-04/locations.json`, {
    headers: { 'X-Shopify-Access-Token': token }
  });
  const { locations } = await locRes.json();
  const locationId = locations[0]?.id;
  if (!locationId) throw new Error('No location found');

  await fetch(`https://${store}.myshopify.com/admin/api/2025-04/inventory_levels/set.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ location_id: locationId, inventory_item_id: inventoryItemId, available: newQuantity }),
  });
}

export async function deleteShopifyProduct(sku) {
  const token = await getValidToken();
  const store = process.env.SHOPIFY_STORE_NAME;

  const searchRes = await fetch(`https://${store}.myshopify.com/admin/api/2025-04/products.json?sku=${sku}`, {
    headers: { 'X-Shopify-Access-Token': token }
  });
  const { products } = await searchRes.json();
  if (!products.length) return;
  const shopifyProductId = products[0].id;
  await fetch(`https://${store}.myshopify.com/admin/api/2025-04/products/${shopifyProductId}.json`, {
    method: 'DELETE',
    headers: { 'X-Shopify-Access-Token': token }
  });
}