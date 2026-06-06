import { dbConnect } from '../../../../lib/mongodb';
import Product from '../../../../lib/models/Product';
import { verifyToken, getTokenFromReq } from '../../../../lib/auth';
import bwipjs from 'bwip-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  const token = getTokenFromReq(req);
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sku } = req.query;
  if (!sku) return res.status(400).json({ error: 'SKU is required' });

  const product = await Product.findOne({
    sku: { $regex: new RegExp(`^${sku.trim()}$`, 'i') }
  });

  if (!product) return res.status(404).json({ error: 'Product not found' });

  try {
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: product.sku,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
      backgroundcolor: 'ffffff',
      barcolor: '000000',
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="barcode-${product.sku}.png"`);
    res.end(png);

  } catch (err) {
    console.error('Barcode error:', err);
    return res.status(500).json({ error: 'Barcode generation failed' });
  }
}