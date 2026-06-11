"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Coins, Loader2, Radio, Swords } from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardResponse } from "@/lib/types";
import StatCard from "@/components/StatCard";
import Avatar from "@/components/Avatar";
import CountdownTimer from "@/components/CountdownTimer";
import { timeAgo } from "@/lib/format";

const MEDALS = ["#f59e0b", "#a1a1aa", "#b45309"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    api<DashboardResponse>("/api/dashboard").then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center pt-24">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  const { user, stats, topPlayers, activity, funFriday } = data;
  const xpPct = Math.min(100, Math.round((user.xpIntoLevel / user.xpForNextLevel) * 100));
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative overflow-hidden rounded-2xl p-6 sm:p-8"
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} color={user.avatarColor} size={56} />
            <div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">
                Welcome back, <span className="text-gradient">{firstName}</span>
              </h1>
              <p className="text-sm text-zinc-400">
                {user.department ?? "Free agent"} · Level {user.level}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-300 sm:self-auto">
            <Coins size={16} /> {user.coins.toLocaleString()} coins
          </div>
        </div>
        <div className="relative mt-6">
          <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
            <span className="font-semibold text-violet-300">Level {user.level}</span>
            <span>
              {user.xpIntoLevel} / {user.xpForNextLevel} XP
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
            />
          </div>
        </div>
      </motion.section>

      {/* Fun Friday banner */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`glass flex flex-col items-start gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between ${
          funFriday.active ? "border-green-500/30" : ""
        }`}
      >
        {funFriday.active ? (
          <>
            <div className="flex items-center gap-3">
              <span className="pulse-glow flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1.5 text-xs font-bold text-green-400">
                <Radio size={12} /> LIVE NOW
              </span>
              <p className="text-sm text-zinc-200">
                Fun Friday is <span className="font-bold text-white">on</span>
                {funFriday.secondsToEnd > 0 && (
                  <>
                    {" — "}
                    <CountdownTimer seconds={funFriday.secondsToEnd} className="font-mono font-bold text-green-400" />{" "}
                    left
                  </>
                )}
              </p>
            </div>
            <Link
              href="/games"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-600/30 transition hover:brightness-110"
            >
              <Swords size={16} /> Enter the Arena
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-300">
              The Arena opens <span className="font-semibold text-white">Friday {funFriday.window.start}</span> — in{" "}
              <CountdownTimer seconds={funFriday.secondsToStart} className="font-mono font-bold text-violet-300" />
            </p>
            <Link
              href="/games"
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-violet-500/50 hover:text-white"
            >
              Preview games
            </Link>
          </>
        )}
      </motion.section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="gamepad-2" label="Games played" value={stats.games_played} accent="#8b5cf6" delay={0.15} />
        <StatCard icon="trending-up" label="Best score" value={stats.best_score.toLocaleString()} accent="#22d3ee" delay={0.2} />
        <StatCard icon="sparkles" label="XP from games" value={stats.xp_from_games.toLocaleString()} accent="#e879f9" delay={0.25} />
        <StatCard
          icon="crown"
          label="Weekly rank"
          value={stats.weekly_rank !== null ? `#${stats.weekly_rank}` : "—"}
          accent="#f59e0b"
          delay={0.3}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Top players */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5 lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Top players this week</h2>
            <Link href="/leaderboard" className="text-xs font-semibold text-violet-300 hover:underline">
              Full leaderboard
            </Link>
          </div>
          <div className="space-y-3">
            {topPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-black"
                  style={{ backgroundColor: MEDALS[i] ?? "#52525b" }}
                >
                  {i + 1}
                </span>
                <Avatar name={p.name} color={p.avatar_color} size={34} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{p.name}</span>
                <span className="text-sm font-bold text-violet-300">{p.xp.toLocaleString()} XP</span>
              </div>
            ))}
            {topPlayers.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No scores yet this week.</p>}
          </div>
        </motion.section>

        {/* Activity feed */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-2xl p-5 lg:col-span-3"
        >
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-300">Recent activity</h2>
          <div className="space-y-1">
            {activity.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]"
              >
                <Avatar name={a.name} color={a.avatar_color} size={30} />
                <p className="min-w-0 flex-1 truncate text-sm text-zinc-300">
                  <span className="font-semibold text-white">{a.name}</span> {a.message}
                </p>
                <span className="shrink-0 text-xs text-zinc-500">{timeAgo(a.created_at)}</span>
              </motion.div>
            ))}
            {activity.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">All quiet for now.</p>}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
