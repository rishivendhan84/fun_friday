"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { LeaderboardResponse } from "@/lib/types";
import Avatar from "@/components/Avatar";

type Period = "weekly" | "monthly" | "alltime";

const PERIODS: { key: Period; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "alltime", label: "All-Time" },
];

const PODIUM_COLORS = ["#a1a1aa", "#f59e0b", "#b45309"]; // displayed order: 2nd, 1st, 3rd

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<LeaderboardResponse>(`/api/leaderboard?period=${period}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const entries = data?.entries ?? [];
  const podium = [entries[1], entries[0], entries[2]]; // 2nd, 1st, 3rd
  const meId = data?.me?.id ?? null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <h1 className="text-2xl font-black text-white sm:text-3xl">Leaderboard</h1>
        <div className="grid w-full max-w-xs grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                period === p.key ? "bg-violet-600 text-white shadow" : "text-zinc-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading || !data ? (
        <div className="flex justify-center pt-20">
          <Loader2 className="animate-spin text-violet-400" size={32} />
        </div>
      ) : (
        <>
          {/* Podium */}
          {entries.length >= 3 && (
            <div className="flex items-end justify-center gap-3 sm:gap-6">
              {podium.map((p, i) => {
                if (!p) return null;
                const isFirst = i === 1;
                const heights = ["h-24", "h-32", "h-20"];
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="flex w-28 flex-col items-center sm:w-36"
                  >
                    {isFirst && <Crown size={22} className="mb-1 text-amber-400" />}
                    <Avatar name={p.name} color={p.avatar_color} size={isFirst ? 56 : 44} />
                    <p className="mt-2 w-full truncate text-center text-sm font-bold text-white">{p.name}</p>
                    <p className="text-xs font-semibold text-violet-300">{p.xp.toLocaleString()} XP</p>
                    <div
                      className={`mt-2 flex w-full items-start justify-center rounded-t-2xl pt-2 ${heights[i]}`}
                      style={{
                        background: `linear-gradient(180deg, ${PODIUM_COLORS[i]}44, transparent)`,
                        borderTop: `2px solid ${PODIUM_COLORS[i]}`,
                      }}
                    >
                      <span className="text-2xl font-black" style={{ color: PODIUM_COLORS[i] }}>
                        {p.rank}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass overflow-hidden rounded-2xl"
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/8 text-[10px] uppercase tracking-widest text-zinc-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Department</th>
                  <th className="px-4 py-3 text-right">Games</th>
                  <th className="px-4 py-3 text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const isMe = e.id === meId;
                  return (
                    <tr
                      key={e.id}
                      className={`border-b border-white/5 last:border-0 ${
                        isMe ? "bg-violet-600/15 ring-1 ring-inset ring-violet-500/40" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-zinc-400">{e.rank}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={e.name} color={e.avatar_color} size={30} />
                          <span className="font-semibold text-white">
                            {e.name}
                            {isMe && <span className="ml-2 rounded-full bg-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-200">YOU</span>}
                          </span>
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-400 sm:table-cell">{e.department ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{e.games_played}</td>
                      <td className="px-4 py-3 text-right font-bold text-violet-300">{e.xp.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                      No scores in this period yet. Be the first!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>

          {/* Sticky "me" row when not in visible list */}
          {data.me && !entries.some((e) => e.id === meId) && (
            <div className="glass flex items-center gap-3 rounded-2xl border-violet-500/40 p-3 text-sm">
              <span className="font-mono font-bold text-zinc-400">#{data.me.rank}</span>
              <Avatar name={data.me.name} color={data.me.avatar_color} size={30} />
              <span className="flex-1 font-semibold text-white">{data.me.name} (you)</span>
              <span className="font-bold text-violet-300">{data.me.xp.toLocaleString()} XP</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
