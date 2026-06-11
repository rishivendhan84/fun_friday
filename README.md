# Fun Friday — The Arena 🎮

A full-stack employee gaming platform. Every **Friday, 5:00–5:30 PM** the arena
opens: play games, earn XP and coins, climb the leaderboard, unlock
achievements, and redeem real-office rewards.

- **Frontend** — Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion
- **Backend** — Node.js (Express) · JWT auth (httpOnly cookies) · `backend/`
- **Database** — PostgreSQL 16 with migrations + seed data

## The Fun Friday window

The backend is the source of truth: score submission and the prize wheel are
**rejected outside Friday 17:00–17:30** (timezone configurable via
`FUN_FRIDAY_TZ`, default `Asia/Kolkata`). The frontend shows a live countdown
and locks the games until the arena opens.

For local development/demo, set `FUN_FRIDAY_ALWAYS_OPEN=true` on the backend
to keep the arena open all week.

## Quick start (local)

Requires Node 20+ and PostgreSQL 16.

```bash
# 1. Database
sudo -u postgres psql -c "CREATE USER funfriday WITH PASSWORD 'funfriday_dev';" \
                      -c "CREATE DATABASE funfriday OWNER funfriday;"

# 2. Backend  (http://localhost:4000)
cd backend
cp .env.example .env          # adjust if needed
npm install
npm run migrate && npm run seed
FUN_FRIDAY_ALWAYS_OPEN=true npm run dev

# 3. Frontend (http://localhost:3000) — in another terminal, from the repo root
npm install
npm run dev
```

Sign in with a seeded demo account — e.g. `aisha.khan@differenthair.com` /
`FunFriday123` — or register a new one.

## Quick start (Docker)

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

Postgres, the API (migrations + seed run automatically), and the web app come
up together at http://localhost:3000.

## What's inside

| Page | Route | Notes |
| --- | --- | --- |
| Login / Register | `/` | Email + password, department picker, Fun Friday countdown |
| Dashboard | `/dashboard` | Level & XP bar, stats, top players, live activity feed |
| Games Hub | `/games` | Locked outside the Fun Friday window |
| UNO | `/games/uno` | **Playable** vs 3 bots — full deck, skips, reverses, wilds |
| Fastest Finger | `/games/fastest-finger` | **Playable** timed trivia with speed bonus |
| Word Battle | `/games/word-battle` | **Playable** 60s typing race with combo multiplier |
| Word Search | `/games/word-search` | **Playable** drag-to-select 10×10 grid |
| Chess | `/games/chess` | Tournament bracket (view-only) |
| Leaderboard | `/leaderboard` | Weekly / Monthly / All-Time, podium, your rank |
| Achievements | `/achievements` | 10 badges, rarity tiers, auto-unlocked by the server |
| Rewards | `/rewards` | Spin-the-wheel (once per Fun Friday) + coin shop |
| Team Battles | `/teams` | Department tug-of-war on weekly XP |
| Profile | `/profile` | Per-game stats, match history, earned badges |

## Architecture

```
Browser ── Next.js (:3000) ──rewrite /api/*──▶ Express API (:4000) ──▶ PostgreSQL
```

The frontend proxies `/api/*` to the backend (same-origin), so the JWT lives
in an httpOnly cookie — no tokens in JavaScript. The API enforces the game
window, computes XP/coin payouts, unlocks achievements, and runs reward
redemptions in transactions (stock + balance checked atomically).

### Backend layout

```
backend/
  sql/001_init.sql      # schema (users, games, matches, achievements, rewards…)
  src/server.js         # Express app: helmet, CORS, rate limiting
  src/funFriday.js      # timezone-aware window logic
  src/migrate.js        # idempotent SQL migrations
  src/seed.js           # departments, games, questions, rewards, demo users
  src/routes/…          # auth, games/scores, leaderboard, rewards, misc
```

### Key environment variables (backend)

| Var | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | local dev DSN | Postgres connection |
| `JWT_SECRET` | dev value | **Required in production** |
| `FUN_FRIDAY_TZ` | `Asia/Kolkata` | Office timezone for the window |
| `FUN_FRIDAY_ALWAYS_OPEN` | `false` | Dev override to keep the arena open |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed origins (comma separated) |

Frontend: `API_URL` (default `http://localhost:4000`) — where `/api/*` is proxied.
