"use client";

import { motion } from "framer-motion";
import { Crown, Layers, Users, Wifi, WifiOff } from "lucide-react";
import { useRealtime } from "@/lib/realtime";
import { useUser } from "@/components/UserProvider";
import type { MultiplayerGame } from "@/lib/types";
import Avatar from "@/components/Avatar";

const GAME_META: Record<MultiplayerGame, { label: string; icon: typeof Layers; accent: string }> = {
  uno: { label: "UNO", icon: Layers, accent: "#e879f9" },
  chess: { label: "Chess", icon: Crown, accent: "#f59e0b" },
};

interface OnlinePlayersProps {
  /** Which games to offer challenge buttons for. Defaults to both. */
  games?: MultiplayerGame[];
  className?: string;
}

export default function OnlinePlayers({ games = ["uno", "chess"], className }: OnlinePlayersProps) {
  const { user } = useUser();
  const { connected, onlineUsers, currentGame, outgoingInvite, sendInvite } = useRealtime();

  const others = onlineUsers.filter((u) => u.id !== user?.id);
  const me = onlineUsers.find((u) => u.id === user?.id);
  const ordered = me ? [...others, me] : others;
  const canChallenge = connected && currentGame === null && outgoingInvite?.status !== "pending";

  return (
    <div className={`glass rounded-2xl p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
          <Users size={16} className="text-violet-300" /> Who&apos;s online
        </h2>
        {connected ? (
          <span className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400">
            <Wifi size={11} /> {onlineUsers.length} online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <WifiOff size={11} /> Connecting…
          </span>
        )}
      </div>

      {others.length === 0 ? (
        <p className="rounded-xl bg-white/[0.03] px-4 py-6 text-center text-sm text-zinc-400">
          No one else is online yet — get a colleague to sign in!
        </p>
      ) : null}

      <ul className="space-y-2">
        {ordered.map((u, i) => {
          const isMe = u.id === user?.id;
          return (
            <motion.li
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5"
            >
              <div className="relative">
                <Avatar name={u.name} color={u.avatarColor} size={34} />
                <span className="pulse-glow absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a14] bg-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {u.name}
                  {isMe && <span className="ml-1.5 text-xs font-normal text-zinc-500">(you)</span>}
                </p>
                <p className="truncate text-xs text-zinc-500">{u.department ?? "No department"}</p>
              </div>
              {u.inGame ? (
                <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  In game
                </span>
              ) : (
                !isMe && (
                  <div className="flex gap-2">
                    {games.map((g) => {
                      const meta = GAME_META[g];
                      const GIcon = meta.icon;
                      return (
                        <button
                          key={g}
                          onClick={() => sendInvite(u.id, g)}
                          disabled={!canChallenge}
                          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                          style={{
                            borderColor: `${meta.accent}55`,
                            color: meta.accent,
                            backgroundColor: `${meta.accent}14`,
                          }}
                          title={games.length > 1 ? `Challenge to ${meta.label}` : undefined}
                        >
                          <GIcon size={13} />
                          {games.length > 1 ? meta.label : `Challenge to ${meta.label}`}
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
