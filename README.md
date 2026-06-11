# Fun Friday — The Arena 🎮

A frontend-only prototype of an employee gaming platform. Everything runs on
mock data — no backend, no real auth — so the full journey
(login → game → leaderboard → rewards) can be demoed to stakeholders.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click **Sign in with Google** (simulated).

## What's inside

| Page | Route | Notes |
| --- | --- | --- |
| Login | `/` | Google SSO mock, Fun Friday countdown |
| Dashboard | `/dashboard` | Hero stats, XP bar, quick actions, live activity feed |
| Games Hub | `/games` | Entry point to all 5 games |
| UNO | `/games/uno` | **Playable** vs 3 bots — lobby → waiting room → table |
| Chess | `/games/chess` | Tournament bracket (hover player stats) + live match view |
| Fastest Finger | `/games/fastest-finger` | **Playable** timed quiz vs simulated rivals |
| Word Battle | `/games/word-battle` | **Playable** typing race with combo multipliers |
| Word Search | `/games/word-search` | **Playable** drag-to-select grid, hints, difficulty |
| Leaderboard | `/leaderboard` | Weekly / Monthly / All-Time, podium, rank movement |
| Achievements | `/achievements` | Badge gallery, rarity, unlock modal, share card |
| Tournaments | `/tournaments` | Live banner, countdowns, past winners |
| Team Battles | `/teams` | Department tug-of-war score bars |
| Rewards | `/rewards` | Mystery box, spin wheel, XP shop |
| Profile | `/profile` | Stats, per-game win rates, match history |

## Stack

Next.js 15 (App Router) • React 19 • Tailwind CSS v4 • Framer Motion • Lucide

Mock data lives in `lib/data.ts` — edit names, scores, tournaments there.
