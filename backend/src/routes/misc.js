import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getFunFridayStatus } from '../funFriday.js';
import { publicUser } from '../services/levels.js';

const router = Router();

router.get('/fun-friday/status', (req, res) => {
  res.json(getFunFridayStatus());
});

// Public: needed by the registration form
router.get('/departments', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT id, name, color FROM departments ORDER BY name');
    res.json({ departments: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/achievements', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.id, a.code, a.name, a.description, a.icon, a.rarity, a.xp_reward,
              ua.unlocked_at,
              (SELECT COUNT(*)::int FROM user_achievements x WHERE x.achievement_id = a.id) AS holders
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       ORDER BY a.id`,
      [req.user.id]
    );
    res.json({ achievements: rows });
  } catch (err) {
    next(err);
  }
});

// Department tug-of-war: XP earned this week per department
router.get('/teams', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT d.id, d.name, d.color,
              COUNT(DISTINCT u.id)::int AS members,
              COALESCE(SUM(m.xp_earned) FILTER (WHERE m.played_at >= date_trunc('week', now())), 0)::int AS weekly_xp,
              COALESCE(SUM(m.xp_earned), 0)::int AS total_xp
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id
       LEFT JOIN matches m ON m.user_id = u.id
       GROUP BY d.id
       ORDER BY weekly_xp DESC, d.name`
    );
    res.json({ teams: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/activity', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.id, a.type, a.message, a.created_at, u.name, u.avatar_color
       FROM activity a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 25`
    );
    res.json({ activity: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [stats, weekRank, topPlayers, recent] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS games_played,
                COALESCE(MAX(score), 0)::int AS best_score,
                COALESCE(SUM(xp_earned), 0)::int AS xp_from_games
         FROM matches WHERE user_id = $1`,
        [userId]
      ),
      query(
        `SELECT rank FROM (
           SELECT u.id, RANK() OVER (ORDER BY COALESCE(SUM(m.xp_earned), 0) DESC)::int AS rank
           FROM users u
           LEFT JOIN matches m ON m.user_id = u.id AND m.played_at >= date_trunc('week', now())
           GROUP BY u.id
         ) r WHERE r.id = $1`,
        [userId]
      ),
      query(
        `SELECT u.id, u.name, u.avatar_color, COALESCE(SUM(m.xp_earned), 0)::int AS xp
         FROM users u
         LEFT JOIN matches m ON m.user_id = u.id AND m.played_at >= date_trunc('week', now())
         GROUP BY u.id ORDER BY xp DESC LIMIT 3`
      ),
      query(
        `SELECT a.id, a.type, a.message, a.created_at, u.name, u.avatar_color
         FROM activity a LEFT JOIN users u ON u.id = a.user_id
         ORDER BY a.created_at DESC LIMIT 8`
      ),
    ]);

    res.json({
      user: publicUser(req.user),
      stats: { ...stats.rows[0], weekly_rank: weekRank.rows[0]?.rank ?? null },
      topPlayers: topPlayers.rows,
      activity: recent.rows,
      funFriday: getFunFridayStatus(),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [perGame, history, achievements] = await Promise.all([
      query(
        `SELECT g.slug, g.name, g.icon,
                COUNT(m.id)::int AS plays,
                COALESCE(MAX(m.score), 0)::int AS best_score,
                COALESCE(AVG(m.score), 0)::int AS avg_score,
                COALESCE(SUM(m.xp_earned), 0)::int AS xp
         FROM games g
         LEFT JOIN matches m ON m.game_id = g.id AND m.user_id = $1
         GROUP BY g.id ORDER BY plays DESC, g.id`,
        [userId]
      ),
      query(
        `SELECT m.id, g.name AS game, g.slug, m.score, m.xp_earned, m.coins_earned,
                m.duration_seconds, m.played_at
         FROM matches m JOIN games g ON g.id = m.game_id
         WHERE m.user_id = $1 ORDER BY m.played_at DESC LIMIT 15`,
        [userId]
      ),
      query(
        `SELECT a.name, a.icon, a.rarity, ua.unlocked_at
         FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id = $1 ORDER BY ua.unlocked_at DESC`,
        [userId]
      ),
    ]);

    res.json({
      user: publicUser(req.user),
      perGame: perGame.rows,
      history: history.rows,
      achievements: achievements.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
