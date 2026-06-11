"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Loader2, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Team } from "@/lib/types";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);

  useEffect(() => {
    api<{ teams: Team[] }>("/api/teams").then((d) => setTeams(d.teams)).catch(() => {});
  }, []);

  if (!teams) {
    return (
      <div className="flex justify-center pt-24">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  const sorted = [...teams].sort((a, b) => b.weekly_xp - a.weekly_xp);
  const maxXp = Math.max(1, ...sorted.map((t) => t.weekly_xp));
  const leaderId = sorted[0]?.weekly_xp > 0 ? sorted[0].id : null;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Department Tug-of-War</h1>
        <p className="mt-1 text-sm text-zinc-400">Weekly XP by department. Drag your team to the top.</p>
      </motion.div>

      <div className="glass space-y-5 rounded-2xl p-5 sm:p-7">
        {sorted.map((t, i) => {
          const pct = Math.max(4, Math.round((t.weekly_xp / maxXp) * 100));
          const isLeader = t.id === leaderId;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-bold text-white">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                  {isLeader && <Crown size={15} className="text-amber-400" />}
                </span>
                <span className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {t.members}
                  </span>
                  <span className="font-mono font-bold text-white">{t.weekly_xp.toLocaleString()} XP</span>
                </span>
              </div>
              <div className="h-7 overflow-hidden rounded-xl bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                  className="flex h-full items-center justify-end rounded-xl pr-2"
                  style={{
                    background: `linear-gradient(90deg, ${t.color}66, ${t.color})`,
                    boxShadow: isLeader ? `0 0 16px ${t.color}88` : undefined,
                  }}
                >
                  {pct > 15 && <span className="text-[10px] font-black text-black/60">{pct}%</span>}
                </motion.div>
              </div>
              <p className="mt-1 text-right text-[11px] text-zinc-500">
                {t.total_xp.toLocaleString()} XP all-time
              </p>
            </motion.div>
          );
        })}
        {sorted.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No teams yet.</p>}
      </div>
    </div>
  );
}
