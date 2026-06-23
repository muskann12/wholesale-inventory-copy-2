import { getValidToken } from './tokenManager';

export async function syncProductToShopify(product) {
  const token = await getValidToken();
  const store = process.env.SHOPIFY_STORE_NAME;

  const shopifyVariants = product.variants.map(v => ({
    option1: v.size,
    price: v.sellingPrice.toString(),
    sku: `${product.sku}-${v.size.charAt(0)}`,
    inventory_quantity: v.quantity,
    inventory_management: 'shopify',
  }));

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
        vendor: 'Manha Clothing',
        product_type: 'Clothing',
        status: 'draft',
        options: [{ name: 'Size', values: ['Small', 'Medium', 'Large'] }],
        variants: shopifyVariants,
        images,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Shopify sync error: ${JSON.stringify(data.errors)}`);

  // Save Shopify IDs back to the product
  const shopifyProductId = data.product.id;
  const variantIds = {};
  const inventoryItemIds = {};
  data.product.variants.forEach(v => {
    variantIds[v.option1] = v.id;
    inventoryItemIds[v.option1] = v.inventory_item_id;
  });

  product.shopifyProductId = shopifyProductId;
  product.shopifyVariantIds = variantIds;
  product.shopifyInventoryItemIds = inventoryItemIds;
  await product.save().catch(err => console.error('Failed to save Shopify IDs:', err));

  return data.product;
}

export async function updateShopifyProduct(product) {
  const token = await getValidToken();
  const store = process.env.SHOPIFY_STORE_NAME;

  let shopifyProductId = product.shopifyProductId;

  if (!shopifyProductId) {
    // Fallback: search by base SKU
    const searchRes = await fetch(
      `https://${store}.myshopify.com/admin/api/2025-04/products.json?limit=250`,
      { headers: { 'X-Shopify-Access-Token': token } }
    );
    const { products } = await searchRes.json();
    // Find product whose any variant SKU starts with our base SKU
    const found = products?.find(p =>
      p.variants?.some(v => v.sku?.startsWith(product.sku))
    );
    if (!found) {
      console.log(`⚠️ Product ${product.sku} not in Shopify, creating...`);
      return await syncProductToShopify(product);
    }
    shopifyProductId = found.id;
    product.shopifyProductId = shopifyProductId;
    await product.save().catch(console.error);
  }

  const existingVariantIds = product.shopifyVariantIds || {};
  const updatedVariants = product.variants.map(v => ({
    id: existingVariantIds[v.size] || undefined,
    option1: v.size,
    sku: `${product.sku}-${v.size.charAt(0)}`,
    price: v.sellingPrice.toString(),
    // intentionally omitting inventory_quantity — Shopify ignores it on PUT anyway
    inventory_management: 'shopify',
  }));

  const images = product.images?.map(url => ({ src: url })) || [];
  if (!product.images?.length && product.imageUrl) {
    images.push({ src: product.imageUrl });
  }

  const response = await fetch(
    `https://${store}.myshopify.com/admin/api/2025-04/products/${shopifyProductId}.json`,
    {
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
          images,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Shopify update failed: ${errText}`);
  }

  const data = await response.json();

  // Always refresh and save variant IDs + inventory_item_ids after update
  const newVariantIds = {};
  const newInventoryItemIds = {};
  data.product.variants.forEach(v => {
    newVariantIds[v.option1] = v.id;
    newInventoryItemIds[v.option1] = v.inventory_item_id;
  });
  product.shopifyVariantIds = newVariantIds;
  product.shopifyInventoryItemIds = newInventoryItemIds;
  await product.save().catch(console.error);

  return data.product;
}

// ---------------------------------------------------------
// Reliable inventory update: uses inventory_item_id directly
// No SKU search — avoids Shopify's unreliable product search
// ---------------------------------------------------------
export async function updateShopifyInventory(inventoryItemId, newQuantity, token, store) {
  // Fetch all locations and use the first active one
  const locRes = await fetch(
    `https://${store}.myshopify.com/admin/api/2025-04/locations.json`,
    { headers: { 'X-Shopify-Access-Token': token } }
  );
  const locData = await locRes.json();
  if (!locRes.ok) throw new Error(`Failed to fetch locations: ${JSON.stringify(locData)}`);

  const locationId = locData.locations?.[0]?.id;
  if (!locationId) throw new Error('No Shopify location found');

  console.log(`📦 Updating inventory_item_id=${inventoryItemId} to qty=${newQuantity} at location=${locationId}`);

  const updateRes = await fetch(
    `https://${store}.myshopify.com/admin/api/2025-04/inventory_levels/set.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: newQuantity,
      }),
    }
  );

  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    console.error('❌ Inventory set failed:', JSON.stringify(updateData, null, 2));
    throw new Error(`Inventory update failed: ${JSON.stringify(updateData.errors || updateData)}`);
  }

  console.log(`✅ Inventory set: item=${inventoryItemId}, qty=${newQuantity}`);
  return updateData;
}

export async function deleteShopifyProduct(sku) {
  const token = await getValidToken();
  const store = process.env.SHOPIFY_STORE_NAME;

  const searchRes = await fetch(
    `https://${store}.myshopify.com/admin/api/2025-04/products.json?limit=250`,
    { headers: { 'X-Shopify-Access-Token': token } }
  );
  const { products } = await searchRes.json();
  const found = products?.find(p => p.variants?.some(v => v.sku?.startsWith(sku)));
  if (!found) return;

  await fetch(
    `https://${store}.myshopify.com/admin/api/2025-04/products/${found.id}.json`,
    { method: 'DELETE', headers: { 'X-Shopify-Access-Token': token } }
  );
}