import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getFunFridayStatus } from '../funFriday.js';
import { evaluateAchievements } from '../services/achievements.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT g.id, g.slug, g.name, g.description, g.icon, g.playable,
              COUNT(m.id)::int AS plays,
              COALESCE(MAX(m.score), 0)::int AS top_score
       FROM games g
       LEFT JOIN matches m ON m.game_id = g.id
       GROUP BY g.id ORDER BY g.id`
    );
    res.json({ games: rows });
  } catch (err) {
    next(err);
  }
});

// Game content (quiz questions, word lists, etc.) — only while the arena is open
router.get('/:slug', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM games WHERE slug = $1', [req.params.slug]);
    if (rows.length === 0) return res.status(404).json({ error: 'Game not found' });
    const game = rows[0];
    const status = getFunFridayStatus();
    const content = status.active ? game.content : null;
    res.json({
      game: {
        id: game.id,
        slug: game.slug,
        name: game.name,
        description: game.description,
        icon: game.icon,
        playable: game.playable,
        content,
      },
      funFriday: status,
    });
  } catch (err) {
    next(err);
  }
});

const MAX_SCORE = 10000;

// Submit a finished match. Server enforces the Fun Friday window.
router.post('/:slug/scores', requireAuth, async (req, res, next) => {
  try {
    const status = getFunFridayStatus();
    if (!status.active) {
      return res.status(403).json({
        error: 'The arena is closed. Games can only be played on Friday 5:00-5:30 PM.',
        funFriday: status,
      });
    }

    const { score, durationSeconds = 0, metadata = {} } = req.body || {};
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
      return res.status(400).json({ error: `Score must be an integer between 0 and ${MAX_SCORE}` });
    }

    const gameRes = await query('SELECT id, slug, name, playable FROM games WHERE slug = $1', [
      req.params.slug,
    ]);
    if (gameRes.rows.length === 0) return res.status(404).json({ error: 'Game not found' });
    const game = gameRes.rows[0];
    if (!game.playable) return res.status(400).json({ error: 'This game is not playable yet' });

    const xpEarned = Math.min(500, 25 + Math.floor(score / 4));
    const coinsEarned = Math.min(200, 10 + Math.floor(score / 10));

    const result = await withTransaction(async (client) => {
      const matchRes = await client.query(
        `INSERT INTO matches (user_id, game_id, score, xp_earned, coins_earned, duration_seconds, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, played_at`,
        [
          req.user.id,
          game.id,
          score,
          xpEarned,
          coinsEarned,
          Math.max(0, Math.floor(durationSeconds)),
          JSON.stringify(metadata),
        ]
      );

      const userRes = await client.query(
        'UPDATE users SET xp = xp + $1, coins = coins + $2 WHERE id = $3 RETURNING xp, coins',
        [xpEarned, coinsEarned, req.user.id]
      );

      const countRes = await client.query(
        'SELECT COUNT(*)::int AS total FROM matches WHERE user_id = $1',
        [req.user.id]
      );

      await client.query('INSERT INTO activity (user_id, type, message) VALUES ($1, $2, $3)', [
        req.user.id,
        'match',
        `scored ${score} in ${game.name}`,
      ]);

      // Seconds into the live window (null when playing via the dev override)
      const secondsIntoWindow = status.isWindow ? 1800 - status.secondsToEnd : null;

      const unlocked = await evaluateAchievements(client, req.user.id, {
        score,
        gameSlug: game.slug,
        won: Boolean(metadata.won),
        totalMatches: countRes.rows[0].total,
        totalXp: userRes.rows[0].xp,
        secondsIntoWindow,
      });

      return {
        matchId: matchRes.rows[0].id,
        xpEarned,
        coinsEarned,
        totals: userRes.rows[0],
        achievementsUnlocked: unlocked,
      };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
