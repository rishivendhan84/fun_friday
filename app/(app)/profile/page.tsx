"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";
import type { ProfileResponse } from "@/lib/types";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import { RARITY_COLORS } from "@/components/AchievementToast";
import { timeAgo } from "@/lib/format";

export default function ProfilePage() {
  const [data, setData] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    api<ProfileResponse>("/api/profile").then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center pt-24">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  const { user, perGame, history, achievements } = data;
  const xpPct = Math.min(100, Math.round((user.xpIntoLevel / user.xpForNextLevel) * 100));

  return (
    <div className="space-y-6">
      {/* User card */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass flex flex-col items-center gap-5 rounded-2xl p-6 sm:flex-row sm:p-8"
      >
        {/* Level ring */}
        <div className="relative">
          <svg width="104" height="104" className="-rotate-90">
            <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <motion.circle
              cx="52"
              cy="52"
              r="46"
              fill="none"
              stroke="url(#xpGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 46}
              initial={{ strokeDashoffset: 2 * Math.PI * 46 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 46 * (1 - xpPct / 100) }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
            <defs>
              <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Avatar name={user.name} color={user.avatarColor} size={76} />
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
            LV {user.level}
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-black text-white">{user.name}</h1>
          <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-zinc-400 sm:justify-start">
            <Mail size={13} /> {user.email}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{user.department ?? "No department"}</p>
          <div className="mx-auto mt-3 max-w-xs sm:mx-0">
            <div className="mb-1 flex justify-between text-[11px] text-zinc-500">
              <span>Level {user.level}</span>
              <span>
                {user.xpIntoLevel}/{user.xpForNextLevel} XP
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 sm:flex-col">
          <div className="rounded-2xl bg-amber-500/15 px-5 py-3 text-center">
            <p className="flex items-center justify-center gap-1.5 text-lg font-black text-amber-300">
              <Coins size={17} /> {user.coins.toLocaleString()}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Coins</p>
          </div>
          <div className="rounded-2xl bg-violet-500/15 px-5 py-3 text-center">
            <p className="text-lg font-black text-violet-300">{user.xp.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Total XP</p>
          </div>
        </div>
      </motion.section>

      {/* Achievements strip */}
      {achievements.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-300">Earned achievements</h2>
          <div className="flex flex-wrap gap-2.5">
            {achievements.map((a) => {
              const color = RARITY_COLORS[a.rarity];
              return (
                <span
                  key={a.name}
                  title={`Unlocked ${timeAgo(a.unlocked_at)}`}
                  className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold"
                  style={{ backgroundColor: `${color}1c`, color, border: `1px solid ${color}44` }}
                >
                  <Icon name={a.icon} size={14} /> {a.name}
                </span>
              );
            })}
          </div>
        </motion.section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Per-game stats */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass overflow-hidden rounded-2xl"
        >
          <h2 className="px-5 pt-5 text-sm font-bold uppercase tracking-wider text-zinc-300">Per-game stats</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-widest text-zinc-500">
                <th className="px-5 py-2.5">Game</th>
                <th className="px-3 py-2.5 text-right">Plays</th>
                <th className="px-3 py-2.5 text-right">Best</th>
                <th className="px-3 py-2.5 text-right">Avg</th>
                <th className="px-5 py-2.5 text-right">XP</th>
              </tr>
            </thead>
            <tbody>
              {perGame.map((g) => (
                <tr key={g.slug} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5 font-semibold text-white">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                        <Icon name={g.icon} size={15} />
                      </span>
                      {g.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-zinc-300">{g.plays}</td>
                  <td className="px-3 py-3 text-right font-bold text-cyan-300">{g.best_score.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right text-zinc-300">{Math.round(g.avg_score).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-bold text-violet-300">{g.xp.toLocaleString()}</td>
                </tr>
              ))}
              {perGame.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                    No games played yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.section>

        {/* Match history */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5"
        >
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-300">Match history</h2>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {history.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{m.game}</p>
                  <p className="text-xs text-zinc-500">{timeAgo(m.played_at)}</p>
                </div>
                <span className="font-mono text-sm font-black text-white">{m.score.toLocaleString()}</span>
                <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300">
                  +{m.xp_earned} XP
                </span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">
                  +{m.coins_earned}
                </span>
              </div>
            ))}
            {history.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No matches yet.</p>}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
