import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const PERIODS = {
  weekly: "m.played_at >= date_trunc('week', now())",
  monthly: "m.played_at >= date_trunc('month', now())",
  alltime: 'TRUE',
};

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const period = PERIODS[req.query.period] ? req.query.period : 'weekly';
    const where = PERIODS[period];

    const { rows } = await query(
      `SELECT u.id, u.name, u.avatar_color, d.name AS department,
              COALESCE(SUM(m.xp_earned), 0)::int AS xp,
              COALESCE(SUM(m.score), 0)::int AS total_score,
              COUNT(m.id)::int AS games_played,
              RANK() OVER (ORDER BY COALESCE(SUM(m.xp_earned), 0) DESC, COALESCE(SUM(m.score), 0) DESC)::int AS rank
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN matches m ON m.user_id = u.id AND ${where}
       GROUP BY u.id, d.name
       ORDER BY rank
       LIMIT 50`
    );

    const me = rows.find((r) => r.id === req.user.id) || null;
    res.json({ period, entries: rows, me });
  } catch (err) {
    next(err);
  }
});

export default router;
