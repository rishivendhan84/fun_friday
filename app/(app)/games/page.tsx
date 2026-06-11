"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Loader2, Lock, Play, Radio } from "lucide-react";
import { api } from "@/lib/api";
import type { FunFridayStatus, GameSummary } from "@/lib/types";
import Icon from "@/components/Icon";
import CountdownTimer from "@/components/CountdownTimer";

const ACCENTS = ["#8b5cf6", "#22d3ee", "#e879f9", "#34d399", "#f59e0b"];

export default function GamesPage() {
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [status, setStatus] = useState<FunFridayStatus | null>(null);

  useEffect(() => {
    api<{ games: GameSummary[] }>("/api/games").then((d) => setGames(d.games)).catch(() => {});
    api<FunFridayStatus>("/api/fun-friday/status").then(setStatus).catch(() => {});
  }, []);

  if (!games || !status) {
    return (
      <div className="flex justify-center pt-24">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  const open = status.active;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-white sm:text-3xl">The Arena</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
          {open ? (
            <>
              <span className="pulse-glow flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">
                <Radio size={12} /> LIVE NOW
              </span>
              <span>
                Games are open
                {status.secondsToEnd > 0 && (
                  <>
                    {" for "}
                    <CountdownTimer seconds={status.secondsToEnd} className="font-mono font-bold text-green-400" />
                  </>
                )}
                . Good luck!
              </span>
            </>
          ) : (
            <span>
              Locked — opens in{" "}
              <CountdownTimer seconds={status.secondsToStart} className="font-mono font-bold text-violet-300" />
            </span>
          )}
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g, i) => {
          const accent = ACCENTS[i % ACCENTS.length];
          const isChess = g.slug === "chess";
          const clickable = isChess || open;
          const href = `/games/${g.slug}`;

          const card = (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`glass glass-hover relative flex h-full flex-col overflow-hidden rounded-2xl p-5 ${
                clickable ? "" : "pointer-events-none"
              }`}
            >
              <div
                className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
                style={{ backgroundColor: `${accent}26` }}
              />
              <div className="relative flex items-start justify-between">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${accent}22`, color: accent }}
                >
                  <Icon name={g.icon} size={24} />
                </span>
                {isChess ? (
                  <span className="flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                    <Eye size={11} /> View only
                  </span>
                ) : open ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400">
                    <Play size={11} /> Playable
                  </span>
                ) : null}
              </div>
              <h3 className="relative mt-4 text-lg font-bold text-white">{g.name}</h3>
              <p className="relative mt-1 flex-1 text-sm text-zinc-400">{g.description}</p>
              <div className="relative mt-4 flex items-center gap-4 border-t border-white/8 pt-3 text-xs text-zinc-500">
                <span>
                  <span className="font-bold text-zinc-300">{g.plays.toLocaleString()}</span> plays
                </span>
                <span>
                  Top score <span className="font-bold" style={{ color: accent }}>{g.top_score.toLocaleString()}</span>
                </span>
              </div>

              {/* Lock overlay */}
              {!clickable && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-[2px]">
                  <Lock size={22} className="text-zinc-400" />
                  <p className="text-xs font-semibold text-zinc-300">Unlocks in</p>
                  <CountdownTimer seconds={status.secondsToStart} className="font-mono text-sm font-bold text-violet-300" />
                </div>
              )}
            </motion.div>
          );

          return clickable ? (
            <Link key={g.id} href={href} className="h-full">
              {card}
            </Link>
          ) : (
            <div key={g.id} className="h-full cursor-not-allowed">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
