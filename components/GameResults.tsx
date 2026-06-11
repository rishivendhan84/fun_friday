"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Coins, Loader2, RotateCcw, Sparkles, Trophy } from "lucide-react";
import type { ScoreResult } from "@/lib/types";
import AchievementToast from "@/components/AchievementToast";

interface GameResultsProps {
  title: string;
  score: number;
  /** Extra stat lines, e.g. [["Correct", "9/12"]] */
  stats?: [string, string][];
  result: ScoreResult | null;
  error: string | null;
  submitting: boolean;
  onPlayAgain: () => void;
}

export default function GameResults({ title, score, stats, result, error, submitting, onPlayAgain }: GameResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass mx-auto mt-8 max-w-md rounded-2xl p-8 text-center"
    >
      {result && <AchievementToast achievements={result.achievementsUnlocked} />}

      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/40">
        <Trophy size={30} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>

      <motion.p
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="text-gradient my-3 text-6xl font-black"
      >
        {score.toLocaleString()}
      </motion.p>
      <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">Final score</p>

      {stats && stats.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
              <p className="text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {submitting && (
        <p className="flex items-center justify-center gap-2 py-3 text-sm text-zinc-400">
          <Loader2 size={14} className="animate-spin" /> Submitting score...
        </p>
      )}

      {error && <p className="my-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-2 flex items-center justify-center gap-3"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-4 py-2 text-sm font-bold text-violet-300">
            <Sparkles size={15} /> +{result.xpEarned} XP
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-300">
            <Coins size={15} /> +{result.coinsEarned}
          </span>
        </motion.div>
      )}

      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={onPlayAgain}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110"
        >
          <RotateCcw size={15} /> Play again
        </button>
        <Link
          href="/games"
          className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-violet-500/50 hover:text-white"
        >
          <ArrowLeft size={15} /> All games
        </Link>
      </div>
    </motion.div>
  );
}
