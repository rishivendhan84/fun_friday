import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../middleware/auth.js';
import { publicUser } from '../services/levels.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again later' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, name, departmentId } = req.body || {};
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const hash = await bcrypt.hash(password, 12);
    const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name, department_id, avatar_color)
       VALUES (lower($1), $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, name, xp, coins, avatar_color, department_id`,
      [email.trim(), hash, name.trim(), departmentId || null, color]
    );
    if (rows.length === 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const user = rows[0];
    if (user.department_id) {
      const dept = await query('SELECT name FROM departments WHERE id = $1', [user.department_id]);
      user.department = dept.rows[0]?.name;
    }
    await query('INSERT INTO activity (user_id, type, message) VALUES ($1, $2, $3)', [
      user.id,
      'joined',
      'joined the arena',
    ]);
    setAuthCookie(res, signToken(user));
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const { rows } = await query(
      `SELECT u.*, d.name AS department FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.email = lower($1)`,
      [email.trim()]
    );
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    setAuthCookie(res, signToken(user));
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
