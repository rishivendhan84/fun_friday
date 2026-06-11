export interface User {
  id: number;
  email: string;
  name: string;
  department: string | null;
  avatarColor: string;
  coins: number;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export interface Department {
  id: number;
  name: string;
  color: string;
}

export interface FunFridayStatus {
  active: boolean;
  isWindow: boolean;
  alwaysOpen: boolean;
  timezone: string;
  window: { day: string; start: string; end: string };
  secondsToStart: number;
  secondsToEnd: number;
  nextStartAt: string | null;
  endsAt: string | null;
  serverTime: string;
}

export interface GameSummary {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  playable: boolean;
  plays: number;
  top_score: number;
}

export interface FastestFingerContent {
  secondsPerQuestion: number;
  questions: { q: string; options: string[]; answer: number }[];
}

export interface WordBattleContent {
  durationSeconds: number;
  words: string[];
}

export interface WordSearchContent {
  durationSeconds: number;
  gridSize: number;
  wordSets: string[][];
}

export interface BracketMatch {
  round: string;
  p1: string;
  p2: string;
  winner: string | null;
}

export interface ChessContent {
  bracket: BracketMatch[];
}

export interface GameDetail<C> {
  game: {
    id: number;
    slug: string;
    name: string;
    description: string;
    icon: string;
    playable: boolean;
    content: C | null;
  };
  funFriday: FunFridayStatus;
}

export interface AchievementUnlocked {
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  xp_reward: number;
}

export interface ScoreResult {
  matchId: number;
  xpEarned: number;
  coinsEarned: number;
  totals: { xp: number; coins: number };
  achievementsUnlocked: AchievementUnlocked[];
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  avatar_color: string;
  department: string | null;
  xp: number;
  total_score: number;
  games_played: number;
  rank: number;
}

export interface LeaderboardResponse {
  period: string;
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  xp_reward: number;
  unlocked_at: string | null;
  holders: number;
}

export interface Reward {
  id: number;
  name: string;
  description: string;
  icon: string;
  cost_coins: number;
  stock: number;
}

export interface Redemption {
  id: number;
  name: string;
  icon: string;
  redeemed_at: string;
}

export interface RewardsResponse {
  rewards: Reward[];
  redemptions: Redemption[];
  coins: number;
}

export interface SpinResult {
  prize: { label: string; coins: number; xp: number };
  totals: { coins: number; xp: number };
  prizeIndex: number;
}

export interface Team {
  id: number;
  name: string;
  color: string;
  members: number;
  weekly_xp: number;
  total_xp: number;
}

export interface ActivityItem {
  id: number;
  type: string;
  message: string;
  created_at: string;
  name: string;
  avatar_color: string;
}

export interface DashboardResponse {
  user: User;
  stats: {
    games_played: number;
    best_score: number;
    xp_from_games: number;
    weekly_rank: number | null;
  };
  topPlayers: { id: number; name: string; avatar_color: string; xp: number }[];
  activity: ActivityItem[];
  funFriday: FunFridayStatus;
}

export interface PerGameStat {
  slug: string;
  name: string;
  icon: string;
  plays: number;
  best_score: number;
  avg_score: number;
  xp: number;
}

export interface MatchHistoryItem {
  id: number;
  game: string;
  slug: string;
  score: number;
  xp_earned: number;
  coins_earned: number;
  duration_seconds: number | null;
  played_at: string;
}

export interface ProfileResponse {
  user: User;
  perGame: PerGameStat[];
  history: MatchHistoryItem[];
  achievements: { name: string; icon: string; rarity: Rarity; unlocked_at: string }[];
}
