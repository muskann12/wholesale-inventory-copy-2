import { verifyToken, getTokenFromReq } from '../../../lib/auth';

export default async function handler(req, res) {
  const token = getTokenFromReq(req);
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.status(200).json({ authenticated: true });
}