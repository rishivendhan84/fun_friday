import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function setAuthCookie(res, token) {
  res.cookie('ff_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie('ff_token', { path: '/' });
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token =
      req.cookies?.ff_token ||
      (header?.startsWith('Bearer ') ? header.slice(7) : null);
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await query(
      `SELECT u.id, u.email, u.name, u.xp, u.coins, u.avatar_color, u.last_spin_at,
              u.department_id, d.name AS department
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1`,
      [payload.sub]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
