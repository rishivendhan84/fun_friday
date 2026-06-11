"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { AchievementUnlocked, Rarity } from "@/lib/types";
import Icon from "@/components/Icon";

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9ca3af",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

export default function AchievementToast({ achievements }: { achievements: AchievementUnlocked[] }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(id);
  }, [achievements]);

  if (achievements.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {visible &&
          achievements.map((a, i) => {
            const color = RARITY_COLORS[a.rarity];
            return (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, y: -30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: i * 0.15, type: "spring", damping: 20 }}
                className="glass pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl p-3 shadow-xl"
                style={{ borderColor: `${color}66`, boxShadow: `0 0 24px ${color}33` }}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  <Icon name={a.icon} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                    {a.rarity} achievement unlocked
                  </p>
                  <p className="truncate text-sm font-bold text-white">{a.name}</p>
                  <p className="truncate text-xs text-zinc-400">
                    {a.description} · +{a.xp_reward} XP
                  </p>
                </div>
                <button onClick={() => setVisible(false)} className="p-1 text-zinc-500 hover:text-white">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
}
