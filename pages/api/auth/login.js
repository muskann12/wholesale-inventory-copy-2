import { createToken, setTokenCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  console.log('Login attempt:', email);

  // HARDCODED FALLBACK (works even if DB fails)
if (email === 'shoukatcollection@gmail.com' && password === 'shoukatcollection@123*') {
  const token = createToken('hardcoded_user_id');
  setTokenCookie(res, token);
  return res.status(200).json({ success: true });
}

  // Optionally, try DB lookup (if you want both)
  try {
    const { dbConnect } = await import('../../../lib/mongodb');
    const User = (await import('../../../lib/models/User')).default;
    const bcrypt = (await import('bcryptjs')).default;

    await dbConnect();
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = createToken(user._id.toString());
      setTokenCookie(res, token);
      console.log('Login success (DB)');
      return res.status(200).json({ success: true });
    }
  } catch (dbErr) {
    console.error('DB login error:', dbErr);
    // fall through to hardcoded check already done
  }

  res.status(401).json({ error: 'Invalid credentials' });
}