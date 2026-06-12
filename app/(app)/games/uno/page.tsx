"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowLeftRight, Ban, Bot, Flag, Layers, Swords } from "lucide-react";
import GameGate from "@/components/GameGate";
import OnlinePlayers from "@/components/OnlinePlayers";
import MultiplayerResults from "@/components/MultiplayerResults";
import UnoBotGame from "@/components/UnoBotGame";
import Avatar from "@/components/Avatar";
import { useRealtime } from "@/lib/realtime";
import { useUser } from "@/components/UserProvider";
import type { MultiplayerContent, UnoCard, UnoColor, UnoState } from "@/lib/types";

/* ---------------- Card rendering (server card codes) ---------------- */

const UNO_HEX: Record<UnoColor, string> = {
  R: "#ef4444",
  G: "#22c55e",
  B: "#3b82f6",
  Y: "#eab308",
};
const UNO_COLOR_NAME: Record<UnoColor, string> = { R: "red", G: "green", B: "blue", Y: "yellow" };
const WILD_COLORS: UnoColor[] = ["R", "G", "B", "Y"];

function MpCardFace({ card, currentColor }: { card: UnoCard; currentColor?: UnoColor }) {
  const hex = card.color !== "W" ? UNO_HEX[card.color] : undefined;
  const label =
    card.value === "skip" ? (
      <Ban size={20} />
    ) : card.value === "rev" ? (
      <ArrowLeftRight size={20} />
    ) : card.value === "wild" ? (
      "W"
    ) : (
      card.value
    );
  return (
    <div
      className="relative flex h-24 w-16 select-none flex-col items-center justify-center rounded-xl border-2 border-white/25 text-xl font-black text-white shadow-lg sm:h-28 sm:w-[4.5rem]"
      style={
        hex
          ? { backgroundColor: hex, boxShadow: `0 4px 16px ${hex}55` }
          : {
              background: "conic-gradient(from 45deg, #ef4444, #eab308, #22c55e, #3b82f6, #ef4444)",
              boxShadow: "0 4px 16px rgba(168,85,247,0.4)",
            }
      }
    >
      <span className="absolute left-1.5 top-1 text-[10px] opacity-80">{typeof label === "string" ? label : null}</span>
      <span className="drop-shadow">{label}</span>
      {card.color === "W" && currentColor && (
        <span
          className="absolute -bottom-1.5 h-3 w-3 rounded-full border border-white"
          style={{ backgroundColor: UNO_HEX[currentColor] }}
        />
      )}
    </div>
  );
}

function MpCardBack({ small }: { small?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg border border-white/15 bg-gradient-to-br from-violet-800 to-fuchsia-900 font-black text-white/70 shadow ${
        small ? "h-12 w-8 text-[9px]" : "h-24 w-16 text-xs sm:h-28 sm:w-[4.5rem]"
      }`}
    >
      UNO
    </div>
  );
}

/* ---------------- Multiplayer table ---------------- */

function isPlayable(card: UnoCard, state: UnoState): boolean {
  return card.color === "W" || card.color === state.currentColor || card.value === state.currentValue;
}

function UnoLive({ state }: { state: UnoState }) {
  const { user } = useUser();
  const { unoPlay, unoDraw, unoPass, leaveGame } = useRealtime();
  const [wildCardId, setWildCardId] = useState<number | null>(null);
  const [confirmForfeit, setConfirmForfeit] = useState(false);

  const opponent = state.players.find((p) => p.id !== user?.id);
  const myTurn = state.turnUserId === user?.id && state.winnerId === null;
  const oppTurn = opponent !== undefined && state.turnUserId === opponent.id && state.winnerId === null;

  function clickCard(card: UnoCard) {
    if (!myTurn || !isPlayable(card, state)) return;
    if (card.color === "W") {
      setWildCardId(card.id);
      return;
    }
    unoPlay(card.id);
  }

  function chooseWildColor(color: UnoColor) {
    if (wildCardId === null) return;
    unoPlay(wildCardId, color);
    setWildCardId(null);
  }

  return (
    <div className="mx-auto mt-4 max-w-3xl">
      {/* Opponent */}
      {opponent && (
        <div
          className={`glass mx-auto max-w-sm rounded-2xl p-4 text-center transition ${
            oppTurn ? "border-cyan-400/60 shadow-lg shadow-cyan-500/10" : ""
          }`}
        >
          <div className="mb-2 flex items-center justify-center gap-2">
            <Avatar name={opponent.name} color={opponent.avatarColor} size={30} />
            <p className={`text-sm font-bold ${oppTurn ? "text-cyan-300" : "text-zinc-300"}`}>
              {opponent.name}
              {oppTurn && <span className="ml-1.5 animate-pulse">●</span>}
            </p>
          </div>
          <div className="flex items-center justify-center -space-x-4">
            {Array.from({ length: Math.min(opponent.cards, 7) }).map((_, k) => (
              <MpCardBack key={k} small />
            ))}
          </div>
          <p className={`mt-2 text-xs font-bold ${opponent.cards === 1 ? "text-red-400" : "text-zinc-400"}`}>
            {opponent.cards} card{opponent.cards !== 1 ? "s" : ""}
            {opponent.cards === 1 ? " — UNO!" : ""}
          </p>
        </div>
      )}

      {/* Table center */}
      <div className="glass my-4 flex items-center justify-center gap-6 rounded-2xl p-5 sm:gap-10">
        <button
          onClick={() => myTurn && !state.mayPass && unoDraw()}
          disabled={!myTurn || state.mayPass}
          className={`group relative transition ${myTurn && !state.mayPass ? "hover:-translate-y-1" : "opacity-60"}`}
          aria-label="Draw a card"
        >
          <MpCardBack />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-cyan-300">
            Draw ({state.deckCount})
          </span>
        </button>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={state.discardTop.id}
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 18 }}
          >
            <MpCardFace card={state.discardTop} currentColor={state.currentColor} />
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col items-center gap-2 text-center">
          <span
            className="h-7 w-7 rounded-full border-2 border-white/40"
            style={{
              backgroundColor: UNO_HEX[state.currentColor],
              boxShadow: `0 0 14px ${UNO_HEX[state.currentColor]}`,
            }}
          />
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {UNO_COLOR_NAME[state.currentColor]}
          </p>
        </div>
      </div>

      {/* Status + actions */}
      <div className="mb-3 flex min-h-9 flex-wrap items-center justify-center gap-3 text-sm text-zinc-300">
        {myTurn ? (
          state.mayPass ? (
            <span className="font-semibold text-violet-300">You drew a playable card — play it or pass.</span>
          ) : (
            <span className="font-semibold text-cyan-300">Your turn — play a card or draw.</span>
          )
        ) : (
          <span>Waiting for {opponent?.name ?? "opponent"}…</span>
        )}
        {state.mayPass && (
          <button
            onClick={unoPass}
            className="rounded-lg bg-violet-500/20 px-4 py-1.5 text-xs font-bold text-violet-300 transition hover:bg-violet-500/30"
          >
            Pass
          </button>
        )}
      </div>

      {/* Your hand */}
      <div className={`glass rounded-2xl p-4 ${myTurn ? "border-violet-500/40" : ""}`}>
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-zinc-400">
          Your hand ({state.yourHand.length}){state.yourHand.length === 1 ? " — UNO!" : ""}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {state.yourHand.map((card) => {
            const playable = myTurn && isPlayable(card, state);
            return (
              <motion.button
                key={card.id}
                layout
                onClick={() => clickCard(card)}
                disabled={!playable}
                whileHover={playable ? { y: -10, scale: 1.05 } : undefined}
                className={`transition ${
                  playable ? "cursor-pointer drop-shadow-[0_0_10px_rgba(167,139,250,0.6)]" : "opacity-50 saturate-50"
                }`}
              >
                <MpCardFace card={card} />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Forfeit */}
      <div className="mt-4 flex justify-center">
        {confirmForfeit ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">Forfeit the match?</span>
            <button
              onClick={() => {
                leaveGame();
                setConfirmForfeit(false);
              }}
              className="rounded-lg bg-red-500/20 px-3 py-2 font-bold text-red-400 transition hover:bg-red-500/30"
            >
              Yes, forfeit
            </button>
            <button
              onClick={() => setConfirmForfeit(false)}
              className="rounded-lg border border-white/10 px-3 py-2 font-semibold text-zinc-300 hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmForfeit(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
          >
            <Flag size={13} /> Forfeit
          </button>
        )}
      </div>

      {/* Wild color picker */}
      <AnimatePresence>
        {wildCardId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="glass w-full max-w-xs rounded-2xl p-6 text-center"
            >
              <Layers size={26} className="mx-auto mb-2 text-violet-300" />
              <h3 className="mb-4 text-lg font-bold text-white">Pick a color</h3>
              <div className="grid grid-cols-2 gap-3">
                {WILD_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => chooseWildColor(c)}
                    className="rounded-xl py-4 text-sm font-black uppercase tracking-wider text-white transition hover:scale-105"
                    style={{ backgroundColor: UNO_HEX[c], boxShadow: `0 4px 14px ${UNO_HEX[c]}66` }}
                  >
                    {UNO_COLOR_NAME[c]}
                  </button>
                ))}
              </div>
              <button onClick={() => setWildCardId(null)} className="mt-4 text-xs text-zinc-400 hover:text-white">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Mode chooser + page ---------------- */

type Mode = "choose" | "multi" | "bots";

function ModeChooser({ onPick }: { onPick: (mode: Exclude<Mode, "choose">) => void }) {
  const cards = [
    {
      mode: "multi" as const,
      icon: Swords,
      accent: "#e879f9",
      title: "Challenge a colleague",
      description: "Head-to-head UNO against someone online right now. Winner takes the XP.",
    },
    {
      mode: "bots" as const,
      icon: Bot,
      accent: "#22d3ee",
      title: "Practice vs bots",
      description: "The classic 4-player table against three bots. Scores count as usual.",
    },
  ];

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
          <Layers size={26} />
        </div>
        <h1 className="text-2xl font-black text-white">UNO Showdown</h1>
        <p className="mt-1 text-sm text-zinc-400">Pick your table.</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ mode, icon: CardIcon, accent, title, description }, i) => (
          <motion.button
            key={mode}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => onPick(mode)}
            className="glass glass-hover relative overflow-hidden rounded-2xl p-6 text-left"
          >
            <div
              className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
              style={{ backgroundColor: `${accent}26` }}
            />
            <span
              className="relative flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              <CardIcon size={24} />
            </span>
            <h3 className="relative mt-4 text-lg font-bold text-white">{title}</h3>
            <p className="relative mt-1 text-sm text-zinc-400">{description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function UnoPage() {
  const { currentGame, lastGameOver, clearLastGameOver } = useRealtime();
  const [mode, setMode] = useState<Mode>("choose");

  if (currentGame && currentGame.game === "uno") {
    return (
      <div>
        <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={15} /> Back to games
        </Link>
        <UnoLive state={currentGame.state} />
      </div>
    );
  }

  if (lastGameOver && lastGameOver.state.game === "uno") {
    return (
      <MultiplayerResults
        payload={lastGameOver}
        onPlayAgain={() => {
          clearLastGameOver();
          setMode("multi");
        }}
        onLeave={clearLastGameOver}
      />
    );
  }

  if (mode === "choose") {
    return (
      <div>
        <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={15} /> Back to games
        </Link>
        <ModeChooser onPick={setMode} />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setMode("choose")}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={15} /> Change mode
      </button>
      <GameGate<MultiplayerContent> slug="uno">
        {() =>
          mode === "bots" ? (
            <UnoBotGame />
          ) : (
            <div className="mx-auto mt-6 max-w-2xl">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
                  <Swords size={26} />
                </div>
                <h1 className="text-2xl font-black text-white">Challenge a colleague</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Pick an opponent below — the match starts as soon as they accept.
                </p>
              </motion.div>
              <OnlinePlayers games={["uno"]} />
            </div>
          )
        }
      </GameGate>
    </div>
  );
}
