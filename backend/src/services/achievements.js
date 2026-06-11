/**
 * Achievement rules evaluated inside the score-submission transaction.
 * Each rule receives stats computed after the new match is inserted.
 */
const RULES = [
  { code: 'first_blood', test: (s) => s.totalMatches >= 1 },
  { code: 'on_fire', test: (s) => s.totalMatches >= 5 },
  { code: 'arena_veteran', test: (s) => s.totalMatches >= 25 },
  { code: 'high_roller', test: (s) => s.score >= 500 },
  { code: 'word_wizard', test: (s) => s.gameSlug.startsWith('word-') && s.score >= 300 },
  { code: 'quiz_master', test: (s) => s.gameSlug === 'fastest-finger' && s.score >= 400 },
  { code: 'uno_champion', test: (s) => s.gameSlug === 'uno' && s.won },
  { code: 'xp_1000', test: (s) => s.totalXp >= 1000 },
  { code: 'xp_5000', test: (s) => s.totalXp >= 5000 },
  { code: 'early_bird', test: (s) => s.secondsIntoWindow !== null && s.secondsIntoWindow <= 300 },
];

/**
 * Unlock any newly-earned achievements. Returns the unlocked achievement rows.
 * Must be called with a client inside an open transaction.
 */
export async function evaluateAchievements(client, userId, stats) {
  const earnedCodes = RULES.filter((r) => r.test(stats)).map((r) => r.code);
  if (earnedCodes.length === 0) return [];

  const { rows: unlocked } = await client.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     SELECT $1, a.id FROM achievements a
     WHERE a.code = ANY($2)
     ON CONFLICT DO NOTHING
     RETURNING achievement_id`,
    [userId, earnedCodes]
  );
  if (unlocked.length === 0) return [];

  const ids = unlocked.map((r) => r.achievement_id);
  const { rows } = await client.query(
    'SELECT id, code, name, description, icon, rarity, xp_reward FROM achievements WHERE id = ANY($1)',
    [ids]
  );

  const bonusXp = rows.reduce((sum, a) => sum + a.xp_reward, 0);
  if (bonusXp > 0) {
    await client.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [bonusXp, userId]);
  }
  for (const a of rows) {
    await client.query(
      'INSERT INTO activity (user_id, type, message) VALUES ($1, $2, $3)',
      [userId, 'achievement', `unlocked "${a.name}" (${a.rarity})`]
    );
  }
  return rows;
}
