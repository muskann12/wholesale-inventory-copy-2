import { dbConnect } from '../../lib/mongodb';
import Product from '../../lib/models/Product';
import { verifyToken, getTokenFromReq } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const token = getTokenFromReq(req);
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

  const { sku } = req.query;
  if (!sku) return res.status(400).json({ error: 'SKU required' });

  const product = await Product.findOne({ 
    sku: { $regex: new RegExp(`^${sku.trim()}$`, 'i') } 
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  res.status(200).json(product);
}