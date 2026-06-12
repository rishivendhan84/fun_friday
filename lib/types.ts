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

/** Content payload for the multiplayer games (uno, chess). */
export interface MultiplayerContent {
  multiplayer: boolean;
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

/* ---------------- Realtime / multiplayer protocol ---------------- */

export type MultiplayerGame = "uno" | "chess";

export interface OnlineUser {
  id: number;
  name: string;
  avatarColor: string;
  department: string | null;
  inGame: boolean;
}

export interface InvitePlayer {
  id: number;
  name: string;
  avatarColor: string;
}

export interface IncomingInvite {
  inviteId: string;
  game: MultiplayerGame;
  from: InvitePlayer;
}

export interface InviteResult {
  inviteId: string;
  accepted: false;
  reason: "declined" | "expired";
  by: InvitePlayer;
}

/* UNO */

export type UnoColor = "R" | "G" | "B" | "Y";
export type UnoCardColor = UnoColor | "W";
export type UnoCardValue =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "rev" | "+2" | "wild" | "+4";

export interface UnoCard {
  id: number;
  color: UnoCardColor;
  value: UnoCardValue;
}

export interface UnoPlayer {
  id: number;
  name: string;
  avatarColor: string;
  cards: number;
}

export interface UnoState {
  game: "uno";
  players: UnoPlayer[];
  yourHand: UnoCard[];
  discardTop: UnoCard;
  currentColor: UnoColor;
  currentValue: UnoCardValue;
  turnUserId: number;
  mayPass: boolean;
  deckCount: number;
  winnerId: number | null;
}

/* Chess */

export type ChessSide = "w" | "b";
export type ChessPromotion = "q" | "r" | "b" | "n";
export type ChessResult = "checkmate" | "draw" | "resign" | "forfeit";

export interface ChessPlayer {
  id: number;
  name: string;
  avatarColor: string;
  color: ChessSide;
}

export interface ChessState {
  game: "chess";
  players: ChessPlayer[];
  fen: string;
  turn: ChessSide;
  yourColor: ChessSide;
  lastMove: { from: string; to: string; san: string } | null;
  check: boolean;
  history: string[];
  winnerId: number | null;
  result: ChessResult | null;
}

export type GameState = UnoState | ChessState;

export type CurrentGame =
  | { roomId: string; game: "uno"; state: UnoState }
  | { roomId: string; game: "chess"; state: ChessState };

export interface MultiplayerRewards {
  xpEarned: number;
  coinsEarned: number;
  totals: { xp: number; coins: number };
  achievementsUnlocked: AchievementUnlocked[];
}

export type GameOverReason = "won" | "checkmate" | "draw" | "resign" | "forfeit";

export interface GameOverPayload {
  roomId: string;
  winnerId: number | null;
  draw: boolean;
  reason: GameOverReason;
  state: GameState;
  rewards: MultiplayerRewards | null;
}
