"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Achievement } from "@/lib/types";
import Icon from "@/components/Icon";
import { RARITY_COLORS } from "@/components/AchievementToast";
import { formatDate } from "@/lib/format";

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [selected, setSelected] = useState<Achievement | null>(null);

  useEffect(() => {
    api<{ achievements: Achievement[] }>("/api/achievements")
      .then((d) => setAchievements(d.achievements))
      .catch(() => {});
  }, []);

  if (!achievements) {
    return (
      <div className="flex justify-center pt-24">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked_at).length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Achievements</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <span className="font-bold text-violet-300">{unlockedCount}</span> of {achievements.length} unlocked
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {achievements.map((a, i) => {
          const color = RARITY_COLORS[a.rarity];
          const unlocked = a.unlocked_at !== null;
          return (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(a)}
              className={`glass glass-hover relative flex flex-col items-center rounded-2xl p-5 text-center ${
                unlocked ? "" : "opacity-60 grayscale"
              }`}
              style={unlocked ? { borderColor: `${color}55` } : undefined}
            >
              {!unlocked && <Lock size={13} className="absolute right-3 top-3 text-zinc-500" />}
              <span
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${color}1e`, color, boxShadow: unlocked ? `0 0 18px ${color}33` : undefined }}
              >
                <Icon name={a.icon} size={26} />
              </span>
              <p className="text-sm font-bold text-white">{a.name}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                {a.rarity}
              </p>
              <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{a.description}</p>
              <p className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500">
                <Users size={11} /> {a.holders} holder{a.holders !== 1 ? "s" : ""}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass relative w-full max-w-sm rounded-2xl p-7 text-center"
              style={{ borderColor: `${RARITY_COLORS[selected.rarity]}66` }}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 text-zinc-500 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <span
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl"
                style={{
                  backgroundColor: `${RARITY_COLORS[selected.rarity]}1e`,
                  color: RARITY_COLORS[selected.rarity],
                  boxShadow: `0 0 30px ${RARITY_COLORS[selected.rarity]}44`,
                }}
              >
                <Icon name={selected.icon} size={38} />
              </span>
              <p
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: RARITY_COLORS[selected.rarity] }}
              >
                {selected.rarity}
              </p>
              <h2 className="mt-1 text-xl font-black text-white">{selected.name}</h2>
              <p className="mt-2 text-sm text-zinc-400">{selected.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-white/5 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Reward</p>
                  <p className="font-bold text-violet-300">+{selected.xp_reward} XP</p>
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Holders</p>
                  <p className="font-bold text-white">{selected.holders}</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                {selected.unlocked_at
                  ? `Unlocked on ${formatDate(selected.unlocked_at)}`
                  : "You haven't unlocked this yet."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
