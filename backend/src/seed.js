import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './db.js';

const DEPARTMENTS = [
  { name: 'Engineering', color: '#8b5cf6' },
  { name: 'Design', color: '#ec4899' },
  { name: 'Marketing', color: '#f59e0b' },
  { name: 'Sales', color: '#10b981' },
  { name: 'HR & Ops', color: '#06b6d4' },
];

const GAMES = [
  {
    slug: 'uno',
    name: 'UNO',
    description: 'Classic card chaos vs 3 bots. Match colors and numbers, save your wilds.',
    icon: 'layers',
    playable: true,
    content: {},
  },
  {
    slug: 'fastest-finger',
    name: 'Fastest Finger',
    description: 'Timed trivia. The faster you answer, the bigger the bonus.',
    icon: 'zap',
    playable: true,
    content: {
      secondsPerQuestion: 10,
      questions: [
        { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], answer: 1 },
        { q: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Tech Transfer Process', 'Hyperlink Text Transport Protocol', 'Home Tool Transfer Protocol'], answer: 0 },
        { q: 'How many keys does a standard piano have?', options: ['66', '76', '88', '98'], answer: 2 },
        { q: 'Which company created the Android OS?', options: ['Apple', 'Microsoft', 'Android Inc.', 'Samsung'], answer: 2 },
        { q: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
        { q: 'In which year did the first iPhone launch?', options: ['2005', '2007', '2009', '2010'], answer: 1 },
        { q: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2 },
        { q: 'Which language runs natively in web browsers?', options: ['Python', 'Java', 'C#', 'JavaScript'], answer: 3 },
        { q: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
        { q: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'], answer: 0 },
        { q: 'Which animal is the fastest on land?', options: ['Lion', 'Cheetah', 'Falcon', 'Gazelle'], answer: 1 },
        { q: 'What is 15% of 200?', options: ['25', '30', '35', '40'], answer: 1 },
      ],
    },
  },
  {
    slug: 'word-battle',
    name: 'Word Battle',
    description: 'Type fast, type clean. Combos multiply your score.',
    icon: 'keyboard',
    playable: true,
    content: {
      durationSeconds: 60,
      words: [
        'arena', 'victory', 'combo', 'pixel', 'quest', 'trophy', 'legend', 'streak',
        'rocket', 'wizard', 'dragon', 'puzzle', 'galaxy', 'thunder', 'shadow', 'crystal',
        'phoenix', 'vortex', 'nebula', 'cipher', 'matrix', 'turbo', 'blaze', 'frost',
        'ember', 'storm', 'knight', 'castle', 'sprint', 'energy', 'fusion', 'orbit',
        'comet', 'meteor', 'plasma', 'quantum', 'zenith', 'apex', 'titan', 'cosmic',
      ],
    },
  },
  {
    slug: 'word-search',
    name: 'Word Search',
    description: 'Drag to find hidden words before the clock runs out.',
    icon: 'search',
    playable: true,
    content: {
      durationSeconds: 180,
      gridSize: 10,
      wordSets: [
        ['REACT', 'NODE', 'QUERY', 'TOKEN', 'CACHE', 'ARRAY'],
        ['PIZZA', 'MANGO', 'BAGEL', 'SALSA', 'CURRY', 'DONUT'],
        ['TIGER', 'EAGLE', 'SHARK', 'ZEBRA', 'PANDA', 'COBRA'],
      ],
    },
  },
  {
    slug: 'chess',
    name: 'Chess Tournament',
    description: 'Monthly bracket. Watch the matches, climb the ladder.',
    icon: 'crown',
    playable: false,
    content: {
      bracket: [
        { round: 'Semifinal', p1: 'Aisha Khan', p2: 'Marcus Lee', winner: 'Aisha Khan' },
        { round: 'Semifinal', p1: 'Priya Sharma', p2: 'Tom Becker', winner: 'Priya Sharma' },
        { round: 'Final', p1: 'Aisha Khan', p2: 'Priya Sharma', winner: null },
      ],
    },
  },
];

const ACHIEVEMENTS = [
  { code: 'first_blood', name: 'First Blood', description: 'Play your first game', icon: 'swords', rarity: 'common', xp_reward: 50 },
  { code: 'on_fire', name: 'On Fire', description: 'Play 5 games', icon: 'flame', rarity: 'common', xp_reward: 75 },
  { code: 'arena_veteran', name: 'Arena Veteran', description: 'Play 25 games', icon: 'shield', rarity: 'rare', xp_reward: 150 },
  { code: 'high_roller', name: 'High Roller', description: 'Score 500+ in a single game', icon: 'trending-up', rarity: 'rare', xp_reward: 150 },
  { code: 'word_wizard', name: 'Word Wizard', description: 'Score 300+ in a word game', icon: 'wand-2', rarity: 'rare', xp_reward: 125 },
  { code: 'quiz_master', name: 'Quiz Master', description: 'Score 400+ in Fastest Finger', icon: 'brain', rarity: 'epic', xp_reward: 200 },
  { code: 'uno_champion', name: 'UNO Champion', description: 'Win a game of UNO', icon: 'crown', rarity: 'epic', xp_reward: 200 },
  { code: 'xp_1000', name: 'Rising Star', description: 'Reach 1,000 total XP', icon: 'star', rarity: 'rare', xp_reward: 100 },
  { code: 'xp_5000', name: 'Living Legend', description: 'Reach 5,000 total XP', icon: 'sparkles', rarity: 'legendary', xp_reward: 500 },
  { code: 'early_bird', name: 'Early Bird', description: 'Play within the first 5 minutes of Fun Friday', icon: 'alarm-clock', rarity: 'epic', xp_reward: 150 },
];

const REWARDS = [
  { name: 'Coffee Voucher', description: 'One free specialty coffee at the cafe downstairs', icon: 'coffee', cost_coins: 150, stock: 40 },
  { name: 'Late Start Pass', description: 'Roll in at 11 AM, no questions asked', icon: 'sunrise', cost_coins: 300, stock: 20 },
  { name: 'Lunch on the House', description: 'Company-paid lunch up to $20', icon: 'utensils', cost_coins: 500, stock: 15 },
  { name: 'Movie Night Tickets', description: 'Two cinema tickets for the weekend', icon: 'clapperboard', cost_coins: 750, stock: 10 },
  { name: 'Half-Day Friday', description: 'Leave at 1 PM on a Friday of your choice', icon: 'plane', cost_coins: 1200, stock: 5 },
  { name: 'Desk Upgrade Kit', description: 'Mechanical keyboard or ergonomic mouse', icon: 'keyboard', cost_coins: 2000, stock: 3 },
];

const DEMO_USERS = [
  { email: 'aisha.khan@differenthair.com', name: 'Aisha Khan', dept: 'Engineering', color: '#8b5cf6' },
  { email: 'marcus.lee@differenthair.com', name: 'Marcus Lee', dept: 'Design', color: '#ec4899' },
  { email: 'priya.sharma@differenthair.com', name: 'Priya Sharma', dept: 'Engineering', color: '#06b6d4' },
  { email: 'tom.becker@differenthair.com', name: 'Tom Becker', dept: 'Marketing', color: '#f59e0b' },
  { email: 'sara.lopez@differenthair.com', name: 'Sara Lopez', dept: 'Sales', color: '#10b981' },
  { email: 'dev.patel@differenthair.com', name: 'Dev Patel', dept: 'HR & Ops', color: '#ef4444' },
];

const DEMO_PASSWORD = 'FunFriday123';

async function seed() {
  await withTransaction(async (c) => {
    for (const d of DEPARTMENTS) {
      await c.query(
        'INSERT INTO departments (name, color) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color',
        [d.name, d.color]
      );
    }

    for (const g of GAMES) {
      await c.query(
        `INSERT INTO games (slug, name, description, icon, playable, content)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description,
           icon = EXCLUDED.icon, playable = EXCLUDED.playable, content = EXCLUDED.content`,
        [g.slug, g.name, g.description, g.icon, g.playable, JSON.stringify(g.content)]
      );
    }

    for (const a of ACHIEVEMENTS) {
      await c.query(
        `INSERT INTO achievements (code, name, description, icon, rarity, xp_reward)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
           rarity = EXCLUDED.rarity, xp_reward = EXCLUDED.xp_reward`,
        [a.code, a.name, a.description, a.icon, a.rarity, a.xp_reward]
      );
    }

    const { rows: existingRewards } = await c.query('SELECT COUNT(*)::int AS n FROM rewards');
    if (existingRewards[0].n === 0) {
      for (const r of REWARDS) {
        await c.query(
          'INSERT INTO rewards (name, description, icon, cost_coins, stock) VALUES ($1, $2, $3, $4, $5)',
          [r.name, r.description, r.icon, r.cost_coins, r.stock]
        );
      }
    }

    const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const userIds = [];
    for (const u of DEMO_USERS) {
      const { rows } = await c.query(
        `INSERT INTO users (email, password_hash, name, department_id, avatar_color)
         VALUES ($1, $2, $3, (SELECT id FROM departments WHERE name = $4), $5)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [u.email, hash, u.name, u.dept, u.color]
      );
      userIds.push(rows[0].id);
    }

    // Demo match history (only if none exists yet) spread over the last 3 weeks
    const { rows: existingMatches } = await c.query('SELECT COUNT(*)::int AS n FROM matches');
    if (existingMatches[0].n === 0) {
      const { rows: games } = await c.query('SELECT id, name FROM games WHERE playable');
      let rngState = 42;
      const rng = () => {
        rngState = (rngState * 1103515245 + 12345) % 2147483648;
        return rngState / 2147483648;
      };
      for (const userId of userIds) {
        const plays = 4 + Math.floor(rng() * 8);
        for (let i = 0; i < plays; i++) {
          const game = games[Math.floor(rng() * games.length)];
          const score = 50 + Math.floor(rng() * 550);
          const xp = Math.min(500, 25 + Math.floor(score / 4));
          const coins = Math.min(200, 10 + Math.floor(score / 10));
          const daysAgo = Math.floor(rng() * 21);
          await c.query(
            `INSERT INTO matches (user_id, game_id, score, xp_earned, coins_earned, duration_seconds, played_at)
             VALUES ($1, $2, $3, $4, $5, $6, now() - ($7 || ' days')::interval)`,
            [userId, game.id, score, xp, coins, 60 + Math.floor(rng() * 240), String(daysAgo)]
          );
          await c.query('UPDATE users SET xp = xp + $1, coins = coins + $2 WHERE id = $3', [
            xp,
            coins,
            userId,
          ]);
        }
        await c.query(
          `INSERT INTO activity (user_id, type, message, created_at)
           VALUES ($1, 'joined', 'joined the arena', now() - interval '21 days')`,
          [userId]
        );
      }
      // Give demo users their basic achievements
      await c.query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         SELECT m.user_id, a.id FROM achievements a
         CROSS JOIN (SELECT DISTINCT user_id FROM matches) m
         WHERE a.code = 'first_blood'
         ON CONFLICT DO NOTHING`
      );
    }
  });
}

seed()
  .then(() => {
    console.log(`Seed complete. Demo users use password: ${DEMO_PASSWORD}`);
    return pool.end();
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
