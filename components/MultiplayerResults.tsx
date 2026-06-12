"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Coins, Handshake, RotateCcw, Sparkles, Swords, Trophy } from "lucide-react";
import type { GameOverPayload, GameOverReason } from "@/lib/types";
import { useUser } from "@/components/UserProvider";
import AchievementToast from "@/components/AchievementToast";
import Avatar from "@/components/Avatar";

function reasonText(reason: GameOverReason, won: boolean, draw: boolean): string {
  if (draw) return "Neither side could find a win.";
  switch (reason) {
    case "checkmate":
      return won ? "Checkmate — a clinical finish!" : "Checkmated — better luck next time.";
    case "resign":
      return won ? "Your opponent resigned." : "You resigned the game.";
    case "forfeit":
      return won ? "Your opponent forfeited the match." : "You forfeited the match.";
    case "won":
      return won ? "You emptied your hand first!" : "Your opponent emptied their hand first.";
    default:
      return "";
  }
}

interface MultiplayerResultsProps {
  payload: GameOverPayload;
  /** Returns to the game lobby (clears the result). */
  onPlayAgain: () => void;
  /** Called when leaving via "Back to games" (clears the result). */
  onLeave?: () => void;
}

export default function MultiplayerResults({ payload, onPlayAgain, onLeave }: MultiplayerResultsProps) {
  const { user } = useUser();
  const won = !payload.draw && payload.winnerId !== null && payload.winnerId === user?.id;
  const draw = payload.draw;
  const opponent = payload.state.players.find((p) => p.id !== user?.id);
  const rewards = payload.rewards;

  const HeadIcon = draw ? Handshake : won ? Trophy : Swords;
  const headClass = draw
    ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-600/40"
    : won
      ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-violet-600/40"
      : "bg-white/10 shadow-black/30";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass mx-auto mt-8 max-w-md rounded-2xl p-8 text-center"
    >
      {rewards && rewards.achievementsUnlocked.length > 0 && (
        <AchievementToast achievements={rewards.achievementsUnlocked} />
      )}

      <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${headClass}`}>
        <HeadIcon size={30} className={won || draw ? "text-white" : "text-zinc-400"} />
      </div>

      <motion.h2
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", delay: 0.15 }}
        className={`text-4xl font-black ${draw ? "text-amber-300" : won ? "text-gradient" : "text-zinc-300"}`}
      >
        {draw ? "It's a draw" : won ? "Victory!" : "Defeat"}
      </motion.h2>
      <p className="mt-2 text-sm text-zinc-400">{reasonText(payload.reason, won, draw)}</p>

      {opponent && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <Avatar name={opponent.name} color={opponent.avatarColor} size={24} />
          <span>
            vs <span className="font-semibold text-zinc-200">{opponent.name}</span>
          </span>
        </div>
      )}

      {rewards && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-5"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-4 py-2 text-sm font-bold text-violet-300">
              <Sparkles size={15} /> +{rewards.xpEarned} XP
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-300">
              <Coins size={15} /> +{rewards.coinsEarned}
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Totals: <span className="font-semibold text-zinc-300">{rewards.totals.xp.toLocaleString()} XP</span> ·{" "}
            <span className="font-semibold text-zinc-300">{rewards.totals.coins.toLocaleString()} coins</span>
          </p>
        </motion.div>
      )}

      <div className="mt-7 flex justify-center gap-3">
        <button
          onClick={onPlayAgain}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110"
        >
          <RotateCcw size={15} /> Play again
        </button>
        <Link
          href="/games"
          onClick={onLeave ?? onPlayAgain}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-violet-500/50 hover:text-white"
        >
          <ArrowLeft size={15} /> Back to games
        </Link>
      </div>
    </motion.div>
  );
}
