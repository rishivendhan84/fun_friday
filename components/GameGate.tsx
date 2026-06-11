"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { FunFridayStatus, GameDetail } from "@/lib/types";
import CountdownTimer from "@/components/CountdownTimer";
import Icon from "@/components/Icon";

interface GameGateProps<C> {
  slug: string;
  children: (content: C, game: GameDetail<C>["game"], funFriday: FunFridayStatus) => React.ReactNode;
}

/**
 * Fetches /api/games/:slug. If content is null (arena closed), shows the
 * locked screen with a countdown instead of the game.
 */
export default function GameGate<C>({ slug, children }: GameGateProps<C>) {
  const [data, setData] = useState<GameDetail<C> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<GameDetail<C>>(`/api/games/${slug}`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load game"));
  }, [slug]);

  if (error) {
    return (
      <div className="glass mx-auto mt-16 max-w-md rounded-2xl p-8 text-center">
        <p className="text-red-400">{error}</p>
        <Link href="/games" className="mt-4 inline-flex items-center gap-2 text-sm text-violet-300 hover:underline">
          <ArrowLeft size={14} /> Back to games
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center pt-24">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  if (data.game.content === null) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass mx-auto mt-16 max-w-md rounded-2xl p-10 text-center"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-zinc-400">
          <Lock size={28} />
        </div>
        <h2 className="mb-1 text-xl font-bold text-white">The Arena is closed</h2>
        <p className="mb-5 text-sm text-zinc-400">
          <span className="mr-1 inline-flex translate-y-0.5">
            <Icon name={data.game.icon} size={14} />
          </span>
          {data.game.name} unlocks every Friday {data.funFriday.window.start}–{data.funFriday.window.end}.
        </p>
        <p className="text-sm text-zinc-300">
          Opens in{" "}
          <CountdownTimer
            seconds={data.funFriday.secondsToStart}
            className="font-mono text-lg font-bold text-violet-300"
          />
        </p>
        <Link
          href="/games"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-violet-500/50 hover:text-white"
        >
          <ArrowLeft size={14} /> Back to games
        </Link>
      </motion.div>
    );
  }

  return <>{children(data.game.content, data.game, data.funFriday)}</>;
}
