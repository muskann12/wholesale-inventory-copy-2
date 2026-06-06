import { dbConnect } from '../../lib/mongodb';
import Product from '../../lib/models/Product';

// Simple in-memory store (resets on server restart)
let lastScannedBarcode = null;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { barcode } = req.body;
    if (!barcode) return res.status(400).json({ error: 'No barcode' });
    
    // Verify product exists
    await dbConnect();
    const product = await Product.findOne({ sku: barcode });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Store for laptop polling
    lastScannedBarcode = barcode;
    return res.status(200).json({ success: true });
  }
  
  if (req.method === 'GET') {
    // Laptop polls this endpoint
    const barcode = lastScannedBarcode;
    lastScannedBarcode = null; // clear after read
    return res.status(200).json({ barcode });
  }
  
  res.status(405).end();
}
