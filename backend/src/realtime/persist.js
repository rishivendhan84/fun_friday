import { query, withTransaction } from '../db.js';
import { evaluateAchievements } from '../services/achievements.js';
import { getFunFridayStatus } from '../funFriday.js';

/**
 * Persist a finished multiplayer match for every participant.
 * results: [{ user: {id,name}, score, won, draw, opponentName }]
 * Returns Map(userId -> { xpEarned, coinsEarned, totals, achievementsUnlocked }).
 */
export async function persistMultiplayerResult(gameSlug, results, durationSeconds) {
  const { rows: gameRows } = await query('SELECT id, name FROM games WHERE slug = $1', [gameSlug]);
  if (gameRows.length === 0) throw new Error(`Unknown game ${gameSlug}`);
  const game = gameRows[0];

  const status = getFunFridayStatus();
  const secondsIntoWindow = status.isWindow ? 1800 - status.secondsToEnd : null;

  const rewards = new Map();
  await withTransaction(async (client) => {
    for (const r of results) {
      const xpEarned = Math.min(500, 25 + Math.floor(r.score / 4));
      const coinsEarned = Math.min(200, 10 + Math.floor(r.score / 10));

      await client.query(
        `INSERT INTO matches (user_id, game_id, score, xp_earned, coins_earned, duration_seconds, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          r.user.id,
          game.id,
          r.score,
          xpEarned,
          coinsEarned,
          Math.max(0, Math.floor(durationSeconds)),
          JSON.stringify({ multiplayer: true, won: !!r.won, draw: !!r.draw, opponent: r.opponentName }),
        ]
      );
      const userRes = await client.query(
        'UPDATE users SET xp = xp + $1, coins = coins + $2 WHERE id = $3 RETURNING xp, coins',
        [xpEarned, coinsEarned, r.user.id]
      );
      const countRes = await client.query(
        'SELECT COUNT(*)::int AS total FROM matches WHERE user_id = $1',
        [r.user.id]
      );

      const verb = r.draw ? 'drew with' : r.won ? 'defeated' : 'lost to';
      await client.query('INSERT INTO activity (user_id, type, message) VALUES ($1, $2, $3)', [
        r.user.id,
        'match',
        `${verb} ${r.opponentName} in ${game.name}`,
      ]);

      const unlocked = await evaluateAchievements(client, r.user.id, {
        score: r.score,
        gameSlug,
        won: !!r.won,
        totalMatches: countRes.rows[0].total,
        totalXp: userRes.rows[0].xp,
        secondsIntoWindow,
      });

      rewards.set(r.user.id, {
        xpEarned,
        coinsEarned,
        totals: userRes.rows[0],
        achievementsUnlocked: unlocked,
      });
    }
  });
  return rewards;
}
