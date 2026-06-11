"use client";

import { motion } from "framer-motion";
import Icon from "@/components/Icon";

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  accent?: string;
  delay?: number;
}

export default function StatCard({ icon, label, value, accent = "#8b5cf6", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass rounded-2xl p-4 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          <Icon name={icon} size={20} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-400">{label}</p>
          <motion.p
            key={String(value)}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xl font-bold text-white sm:text-2xl"
          >
            {value}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
