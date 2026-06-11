import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getFunFridayStatus } from '../funFriday.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [rewards, mine] = await Promise.all([
      query('SELECT id, name, description, icon, cost_coins, stock FROM rewards ORDER BY cost_coins'),
      query(
        `SELECT r.id, rw.name, rw.icon, r.redeemed_at
         FROM redemptions r JOIN rewards rw ON rw.id = r.reward_id
         WHERE r.user_id = $1 ORDER BY r.redeemed_at DESC LIMIT 20`,
        [req.user.id]
      ),
    ]);
    res.json({ rewards: rewards.rows, redemptions: mine.rows, coins: req.user.coins });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/redeem', requireAuth, async (req, res, next) => {
  try {
    const rewardId = Number(req.params.id);
    if (!Number.isInteger(rewardId)) return res.status(400).json({ error: 'Invalid reward' });

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM rewards WHERE id = $1 FOR UPDATE',
        [rewardId]
      );
      const reward = rows[0];
      if (!reward) return { status: 404, body: { error: 'Reward not found' } };
      if (reward.stock < 1) return { status: 409, body: { error: 'Out of stock' } };

      const userRes = await client.query(
        'UPDATE users SET coins = coins - $1 WHERE id = $2 AND coins >= $1 RETURNING coins',
        [reward.cost_coins, req.user.id]
      );
      if (userRes.rows.length === 0) {
        return { status: 400, body: { error: 'Not enough coins' } };
      }

      await client.query('UPDATE rewards SET stock = stock - 1 WHERE id = $1', [rewardId]);
      await client.query(
        'INSERT INTO redemptions (user_id, reward_id) VALUES ($1, $2)',
        [req.user.id, rewardId]
      );
      await client.query('INSERT INTO activity (user_id, type, message) VALUES ($1, $2, $3)', [
        req.user.id,
        'reward',
        `redeemed "${reward.name}"`,
      ]);
      return {
        status: 200,
        body: { reward: { id: reward.id, name: reward.name }, coins: userRes.rows[0].coins },
      };
    });

    res.status(result.status).json(result.body);
  } catch (err) {
    next(err);
  }
});

const WHEEL = [
  { label: '25 coins', coins: 25, xp: 0, weight: 30 },
  { label: '50 coins', coins: 50, xp: 0, weight: 25 },
  { label: '75 XP', coins: 0, xp: 75, weight: 20 },
  { label: '100 coins', coins: 100, xp: 0, weight: 12 },
  { label: '150 XP', coins: 0, xp: 150, weight: 8 },
  { label: 'JACKPOT! 250 coins + 250 XP', coins: 250, xp: 250, weight: 5 },
];

// Spin the wheel — once per Fun Friday, only while the arena is open
router.post('/spin', requireAuth, async (req, res, next) => {
  try {
    const status = getFunFridayStatus();
    if (!status.active) {
      return res.status(403).json({ error: 'The wheel only spins during Fun Friday (Fri 5:00-5:30 PM)' });
    }

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT last_spin_at FROM users WHERE id = $1 FOR UPDATE',
        [req.user.id]
      );
      const last = rows[0].last_spin_at;
      if (last && Date.now() - new Date(last).getTime() < 24 * 3600 * 1000) {
        return { status: 409, body: { error: 'You already spun the wheel this Fun Friday' } };
      }

      const totalWeight = WHEEL.reduce((s, p) => s + p.weight, 0);
      let roll = Math.random() * totalWeight;
      let prize = WHEEL[0];
      for (const p of WHEEL) {
        roll -= p.weight;
        if (roll <= 0) {
          prize = p;
          break;
        }
      }

      const userRes = await client.query(
        `UPDATE users SET coins = coins + $1, xp = xp + $2, last_spin_at = now()
         WHERE id = $3 RETURNING coins, xp`,
        [prize.coins, prize.xp, req.user.id]
      );
      await client.query('INSERT INTO activity (user_id, type, message) VALUES ($1, $2, $3)', [
        req.user.id,
        'spin',
        `won ${prize.label} on the wheel`,
      ]);
      return {
        status: 200,
        body: { prize, totals: userRes.rows[0], prizeIndex: WHEEL.indexOf(prize) },
      };
    });

    res.status(result.status).json(result.body);
  } catch (err) {
    next(err);
  }
});

export default router;
