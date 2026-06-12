"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Hourglass, Loader2, Swords, X } from "lucide-react";
import { INVITE_TTL_MS, useRealtime } from "@/lib/realtime";
import type { MultiplayerGame } from "@/lib/types";
import Avatar from "@/components/Avatar";

const GAME_LABEL: Record<MultiplayerGame, string> = { uno: "UNO", chess: "Chess" };

/**
 * Global realtime UX: incoming challenge modal, "waiting for opponent"
 * indicator and game error toasts. Mounted once in the authed layout.
 */
export default function InviteOverlay() {
  const {
    incomingInvite,
    outgoingInvite,
    gameError,
    acceptInvite,
    declineInvite,
    clearOutgoingInvite,
    clearGameError,
  } = useRealtime();

  // Auto-dismiss the declined/expired notice and error toasts.
  useEffect(() => {
    if (!outgoingInvite || outgoingInvite.status === "pending") return;
    const id = setTimeout(clearOutgoingInvite, 6000);
    return () => clearTimeout(id);
  }, [outgoingInvite, clearOutgoingInvite]);

  useEffect(() => {
    if (!gameError) return;
    const id = setTimeout(clearGameError, 4000);
    return () => clearTimeout(id);
  }, [gameError, clearGameError]);

  const remainingMs = incomingInvite
    ? Math.max(0, INVITE_TTL_MS - (Date.now() - incomingInvite.receivedAt))
    : 0;

  return (
    <>
      {/* Incoming challenge */}
      <AnimatePresence>
        {incomingInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 24 }}
              transition={{ type: "spring", damping: 18 }}
              className="glass w-full max-w-sm rounded-2xl border-violet-500/40 p-6 text-center shadow-2xl shadow-violet-600/20"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, repeatDelay: 0.8 }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/40"
              >
                <Swords size={26} className="text-white" />
              </motion.div>
              <div className="mb-3 flex items-center justify-center gap-2.5">
                <Avatar name={incomingInvite.from.name} color={incomingInvite.from.avatarColor} size={30} />
                <h3 className="text-lg font-bold text-white">
                  {incomingInvite.from.name} challenges you to {GAME_LABEL[incomingInvite.game]}!
                </h3>
              </div>

              {/* Countdown bar */}
              <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  initial={{ width: `${(remainingMs / INVITE_TTL_MS) * 100}%` }}
                  animate={{ width: "0%" }}
                  transition={{ duration: remainingMs / 1000, ease: "linear" }}
                />
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={acceptInvite}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110"
                >
                  <Check size={15} /> Accept
                </button>
                <button
                  onClick={declineInvite}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-red-500/40 hover:text-red-400"
                >
                  <X size={15} /> Decline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outgoing invite status */}
      <AnimatePresence>
        {outgoingInvite && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="glass fixed bottom-20 right-4 z-[55] flex w-72 items-center gap-3 rounded-2xl p-3.5 shadow-xl md:bottom-6"
          >
            {outgoingInvite.status === "pending" ? (
              <Loader2 size={18} className="shrink-0 animate-spin text-violet-300" />
            ) : (
              <Hourglass size={18} className="shrink-0 text-amber-300" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              {outgoingInvite.status === "pending" && (
                <p className="text-zinc-200">
                  Waiting for <span className="font-bold text-white">{outgoingInvite.to.name}</span>…
                  <span className="block text-xs text-zinc-500">
                    {GAME_LABEL[outgoingInvite.game]} challenge sent
                  </span>
                </p>
              )}
              {outgoingInvite.status === "declined" && (
                <p className="text-zinc-200">
                  <span className="font-bold text-white">{outgoingInvite.to.name}</span> declined your{" "}
                  {GAME_LABEL[outgoingInvite.game]} challenge.
                </p>
              )}
              {outgoingInvite.status === "expired" && (
                <p className="text-zinc-200">
                  Your {GAME_LABEL[outgoingInvite.game]} challenge to{" "}
                  <span className="font-bold text-white">{outgoingInvite.to.name}</span> expired.
                </p>
              )}
            </div>
            {outgoingInvite.status !== "pending" && (
              <button onClick={clearOutgoingInvite} className="p-1 text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game error toast */}
      <AnimatePresence>
        {gameError && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="glass fixed bottom-20 left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2.5 rounded-xl border-red-500/30 px-4 py-2.5 text-sm text-red-300 shadow-xl md:bottom-6"
          >
            <AlertTriangle size={15} />
            {gameError}
            <button onClick={clearGameError} className="ml-1 p-0.5 text-zinc-500 hover:text-white">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
