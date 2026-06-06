import { removeTokenCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  removeTokenCookie(res);
  res.status(200).json({ success: true });
}