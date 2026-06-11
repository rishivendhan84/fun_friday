"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Swords } from "lucide-react";
import type { BracketMatch, ChessContent } from "@/lib/types";
import GameGate from "@/components/GameGate";

function MatchCard({ match, delay }: { match: BracketMatch; delay: number }) {
  const players = [match.p1, match.p2];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass w-full rounded-2xl p-4"
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{match.round}</p>
      <div className="space-y-2">
        {players.map((p) => {
          const isWinner = match.winner === p;
          const decided = match.winner !== null;
          return (
            <div
              key={p}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isWinner
                  ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40"
                  : decided
                    ? "bg-white/[0.03] text-zinc-500 line-through"
                    : "bg-white/5 text-white"
              }`}
            >
              <span>{p}</span>
              {isWinner && <Crown size={15} className="text-amber-400" />}
            </div>
          );
        })}
      </div>
      {match.winner === null && (
        <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-cyan-300">
          To be decided
        </p>
      )}
    </motion.div>
  );
}

function Bracket({ content }: { content: ChessContent }) {
  const semis = content.bracket.filter((m) => m.round.toLowerCase().includes("semi"));
  const finals = content.bracket.filter((m) => !m.round.toLowerCase().includes("semi"));
  const champion = finals.find((m) => m.winner)?.winner ?? null;

  return (
    <div className="mx-auto mt-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
          <Crown size={26} />
        </div>
        <h1 className="text-2xl font-black text-white">Chess Tournament</h1>
        <p className="mt-1 text-sm text-zinc-400">Monthly bracket — matches are played over the board. Spectators welcome.</p>
      </motion.div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:items-stretch md:justify-center">
        <div className="flex w-full max-w-xs flex-col justify-around gap-6">
          {semis.map((m, i) => (
            <MatchCard key={`${m.p1}-${m.p2}`} match={m} delay={0.1 + i * 0.1} />
          ))}
        </div>

        {/* Connector */}
        <div className="hidden items-center md:flex">
          <Swords size={20} className="text-zinc-600" />
        </div>

        <div className="flex w-full max-w-xs flex-col justify-center gap-6">
          {finals.map((m, i) => (
            <MatchCard key={`${m.p1}-${m.p2}`} match={m} delay={0.3 + i * 0.1} />
          ))}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl border-amber-500/30 p-4 text-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Champion</p>
            <p className={`mt-1 text-lg font-black ${champion ? "text-amber-300" : "text-zinc-600"}`}>
              {champion ?? "TBD"}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function ChessPage() {
  return (
    <div>
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Back to games
      </Link>
      <GameGate<ChessContent> slug="chess">{(content) => <Bracket content={content} />}</GameGate>
    </div>
  );
}
