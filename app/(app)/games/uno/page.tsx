"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowLeftRight, Ban, Bot, Layers } from "lucide-react";
import GameGate from "@/components/GameGate";
import GameResults from "@/components/GameResults";
import { useScoreSubmit } from "@/lib/useScoreSubmit";

/* ---------------- UNO engine (pure) ---------------- */

type UnoColor = "red" | "green" | "blue" | "yellow";
type UnoValue = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "skip" | "reverse" | "+2" | "wild" | "+4";

interface Card {
  id: number;
  color: UnoColor | null; // null = wild
  value: UnoValue;
}

interface GState {
  hands: Card[][]; // index 0 = human, 1-3 = bots
  drawPile: Card[];
  discard: Card[]; // last element is the top
  activeColor: UnoColor;
  turn: number;
  direction: 1 | -1;
  winner: number | null;
  message: string;
}

const COLORS: UnoColor[] = ["red", "green", "blue", "yellow"];
const COLOR_HEX: Record<UnoColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
};
const BOT_NAMES = ["Bot Riya", "Bot Max", "Bot Zed"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (const color of COLORS) {
    cards.push({ id: id++, color, value: "0" });
    for (let n = 1; n <= 9; n++) {
      const v = String(n) as UnoValue;
      cards.push({ id: id++, color, value: v }, { id: id++, color, value: v });
    }
    for (const v of ["skip", "reverse", "+2"] as UnoValue[]) {
      cards.push({ id: id++, color, value: v }, { id: id++, color, value: v });
    }
  }
  for (let i = 0; i < 4; i++) cards.push({ id: id++, color: null, value: "wild" });
  for (let i = 0; i < 4; i++) cards.push({ id: id++, color: null, value: "+4" });
  return shuffle(cards); // 108 cards
}

function newGame(): GState {
  const deck = buildDeck();
  const hands: Card[][] = [[], [], [], []];
  for (let i = 0; i < 7; i++) for (let p = 0; p < 4; p++) hands[p].push(deck.pop()!);
  // flip until a number card so the game starts clean
  let top = deck.pop()!;
  const buried: Card[] = [];
  while (top.color === null || !/^\d$/.test(top.value)) {
    buried.push(top);
    top = deck.pop()!;
  }
  deck.unshift(...buried);
  return {
    hands,
    drawPile: deck,
    discard: [top],
    activeColor: top.color!,
    turn: 0,
    direction: 1,
    winner: null,
    message: "Your turn — match the color or value.",
  };
}

function canPlay(card: Card, top: Card, activeColor: UnoColor): boolean {
  if (card.color === null) return true;
  return card.color === activeColor || card.value === top.value;
}

function clone(s: GState): GState {
  return {
    ...s,
    hands: s.hands.map((h) => [...h]),
    drawPile: [...s.drawPile],
    discard: [...s.discard],
  };
}

/** Draw n cards into player's hand, reshuffling the discard if needed. */
function draw(s: GState, player: number, n: number) {
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length === 0) {
      if (s.discard.length <= 1) return;
      const top = s.discard.pop()!;
      s.drawPile = shuffle(s.discard);
      s.discard = [top];
    }
    s.hands[player].push(s.drawPile.pop()!);
  }
}

function nextOf(s: GState, from: number, steps = 1): number {
  return (from + s.direction * steps + 8) % 4;
}

function playerName(p: number): string {
  return p === 0 ? "You" : BOT_NAMES[p - 1];
}

/** Play hand[cardIdx] of `player`. Assumes the move is legal. */
function applyPlay(prev: GState, player: number, cardIdx: number, chosenColor?: UnoColor): GState {
  const s = clone(prev);
  const card = s.hands[player].splice(cardIdx, 1)[0];
  s.discard.push(card);
  s.activeColor = card.color ?? chosenColor ?? "red";

  if (s.hands[player].length === 0) {
    s.winner = player;
    s.message = player === 0 ? "You emptied your hand!" : `${playerName(player)} wins this round.`;
    return s;
  }

  let skipNext = false;
  let msg = `${playerName(player)} played ${card.color ?? s.activeColor} ${card.value}.`;
  if (card.value === "reverse") {
    s.direction = s.direction === 1 ? -1 : 1;
    msg = `${playerName(player)} reversed the direction.`;
  } else if (card.value === "skip") {
    skipNext = true;
    msg = `${playerName(player)} skipped ${playerName(nextOf(s, player))}.`;
  } else if (card.value === "+2") {
    const victim = nextOf(s, player);
    draw(s, victim, 2);
    skipNext = true;
    msg = `${playerName(victim)} draws 2 and is skipped.`;
  } else if (card.value === "+4") {
    const victim = nextOf(s, player);
    draw(s, victim, 4);
    skipNext = true;
    msg = `${playerName(player)} chose ${s.activeColor}. ${playerName(victim)} draws 4.`;
  } else if (card.value === "wild") {
    msg = `${playerName(player)} chose ${s.activeColor}.`;
  }

  s.turn = nextOf(s, player, skipNext ? 2 : 1);
  s.message = s.turn === 0 ? `${msg} Your turn.` : msg;
  return s;
}

/** Player draws one card; auto-plays it if possible (bots and human non-wild). */
function applyDraw(prev: GState, player: number, autoPlayWilds: boolean, pickColor: (h: Card[]) => UnoColor): GState | { needsWild: GState } {
  const s = clone(prev);
  draw(s, player, 1);
  const hand = s.hands[player];
  const drawn = hand[hand.length - 1];
  const top = s.discard[s.discard.length - 1];
  if (drawn && canPlay(drawn, top, s.activeColor)) {
    if (drawn.color === null && !autoPlayWilds) {
      s.message = "You drew a wild — pick a color.";
      return { needsWild: s };
    }
    return applyPlay(s, player, hand.length - 1, drawn.color === null ? pickColor(hand) : undefined);
  }
  s.turn = nextOf(s, player);
  s.message = `${playerName(player)} drew a card and passed.${s.turn === 0 ? " Your turn." : ""}`;
  return s;
}

function bestColor(hand: Card[]): UnoColor {
  const counts: Record<UnoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0 };
  for (const c of hand) if (c.color) counts[c.color]++;
  return COLORS.reduce((best, c) => (counts[c] > counts[best] ? c : best), "red" as UnoColor);
}

function botMove(prev: GState): GState {
  const p = prev.turn;
  const top = prev.discard[prev.discard.length - 1];
  const idx = prev.hands[p].findIndex((c) => canPlay(c, top, prev.activeColor));
  if (idx >= 0) {
    const card = prev.hands[p][idx];
    return applyPlay(prev, p, idx, card.color === null ? bestColor(prev.hands[p]) : undefined);
  }
  const r = applyDraw(prev, p, true, bestColor);
  return "needsWild" in r ? r.needsWild : r;
}

/* ---------------- UI ---------------- */

function CardFace({ card, activeColor }: { card: Card; activeColor?: UnoColor }) {
  const hex = card.color ? COLOR_HEX[card.color] : undefined;
  const label =
    card.value === "skip" ? <Ban size={20} /> : card.value === "reverse" ? <ArrowLeftRight size={20} /> : card.value === "wild" ? "W" : card.value;
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
      {card.color === null && activeColor && (
        <span
          className="absolute -bottom-1.5 h-3 w-3 rounded-full border border-white"
          style={{ backgroundColor: COLOR_HEX[activeColor] }}
        />
      )}
    </div>
  );
}

function CardBack({ small }: { small?: boolean }) {
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

function UnoGame() {
  const { result, error, submitting, submit, reset } = useScoreSubmit("uno");
  const [state, setState] = useState<GState>(() => newGame());
  const [pendingWildIdx, setPendingWildIdx] = useState<number | null>(null);
  const startedAtRef = useRef(Date.now());
  const submittedWinRef = useRef(false);

  // Bot turns
  useEffect(() => {
    if (state.winner !== null || state.turn === 0) return;
    const t = setTimeout(() => setState((s) => (s.winner === null && s.turn !== 0 ? botMove(s) : s)), 850);
    return () => clearTimeout(t);
  }, [state]);

  // Submit once on game end
  useEffect(() => {
    if (state.winner === null || submittedWinRef.current) return;
    submittedWinRef.current = true;
    const won = state.winner === 0;
    const botCardsLeft = state.hands.slice(1).reduce((sum, h) => sum + h.length, 0);
    const score = won ? 200 + 10 * botCardsLeft : 50;
    void submit(score, Math.round((Date.now() - startedAtRef.current) / 1000), { won });
  }, [state, submit]);

  const playAgain = useCallback(() => {
    reset();
    submittedWinRef.current = false;
    startedAtRef.current = Date.now();
    setPendingWildIdx(null);
    setState(newGame());
  }, [reset]);

  const top = state.discard[state.discard.length - 1];
  const myTurn = state.turn === 0 && state.winner === null;
  const myHand = state.hands[0];

  function clickCard(idx: number) {
    if (!myTurn) return;
    const card = myHand[idx];
    if (!canPlay(card, top, state.activeColor)) return;
    if (card.color === null) {
      setPendingWildIdx(idx);
      return;
    }
    setState((s) => applyPlay(s, 0, idx));
  }

  function chooseWildColor(color: UnoColor) {
    if (pendingWildIdx === null) return;
    const idx = pendingWildIdx;
    setPendingWildIdx(null);
    setState((s) => {
      // drawn-wild flow stores the wild as the last card; played-wild flow uses the clicked index
      if (idx === -1) return applyPlay(s, 0, s.hands[0].length - 1, color);
      return applyPlay(s, 0, idx, color);
    });
  }

  function clickDraw() {
    if (!myTurn) return;
    setState((s) => {
      const r = applyDraw(s, 0, false, bestColor);
      if ("needsWild" in r) {
        setPendingWildIdx(-1);
        return r.needsWild;
      }
      return r;
    });
  }

  if (state.winner !== null) {
    const won = state.winner === 0;
    const botCardsLeft = state.hands.slice(1).reduce((sum, h) => sum + h.length, 0);
    return (
      <GameResults
        title={won ? "UNO! You win!" : `${playerName(state.winner)} wins`}
        score={won ? 200 + 10 * botCardsLeft : 50}
        stats={[
          ["Result", won ? "Victory" : "Defeat"],
          ["Bot cards left", String(botCardsLeft)],
        ]}
        result={result}
        error={error}
        submitting={submitting}
        onPlayAgain={playAgain}
      />
    );
  }

  return (
    <div className="mx-auto mt-4 max-w-4xl">
      {/* Bots */}
      <div className="grid grid-cols-3 gap-3">
        {BOT_NAMES.map((name, i) => {
          const p = i + 1;
          const isTurn = state.turn === p;
          const count = state.hands[p].length;
          return (
            <div
              key={name}
              className={`glass rounded-2xl p-3 text-center transition ${isTurn ? "border-cyan-400/60 shadow-lg shadow-cyan-500/10" : ""}`}
            >
              <p className={`mb-2 flex items-center justify-center gap-1.5 text-xs font-bold ${isTurn ? "text-cyan-300" : "text-zinc-400"}`}>
                <Bot size={14} /> {name}
                {isTurn && <span className="animate-pulse">●</span>}
              </p>
              <div className="flex items-center justify-center -space-x-4">
                {Array.from({ length: Math.min(count, 5) }).map((_, k) => (
                  <CardBack key={k} small />
                ))}
              </div>
              <p className={`mt-2 text-xs font-bold ${count === 1 ? "text-red-400" : "text-zinc-400"}`}>
                {count} card{count !== 1 ? "s" : ""}
                {count === 1 ? " — UNO!" : ""}
              </p>
            </div>
          );
        })}
      </div>

      {/* Table center */}
      <div className="glass my-4 flex items-center justify-center gap-6 rounded-2xl p-5 sm:gap-10">
        <button
          onClick={clickDraw}
          disabled={!myTurn}
          className={`group relative transition ${myTurn ? "hover:-translate-y-1" : "opacity-60"}`}
          aria-label="Draw a card"
        >
          <CardBack />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-cyan-300">
            Draw ({state.drawPile.length})
          </span>
        </button>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={top.id}
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 18 }}
          >
            <CardFace card={top} activeColor={state.activeColor} />
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col items-center gap-2 text-center">
          <span
            className="h-6 w-6 rounded-full border-2 border-white/40"
            style={{ backgroundColor: COLOR_HEX[state.activeColor], boxShadow: `0 0 12px ${COLOR_HEX[state.activeColor]}` }}
          />
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {state.activeColor}
            <span className="mx-1">·</span>
            {state.direction === 1 ? "→" : "←"}
          </p>
        </div>
      </div>

      <p className="mb-3 min-h-5 text-center text-sm text-zinc-300">{state.message}</p>

      {/* Your hand */}
      <div className={`glass rounded-2xl p-4 ${myTurn ? "border-violet-500/40" : ""}`}>
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-zinc-400">
          Your hand ({myHand.length}){myHand.length === 1 ? " — UNO!" : ""}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {myHand.map((card, idx) => {
            const playable = myTurn && canPlay(card, top, state.activeColor);
            return (
              <motion.button
                key={card.id}
                layout
                onClick={() => clickCard(idx)}
                disabled={!playable}
                whileHover={playable ? { y: -10, scale: 1.05 } : undefined}
                className={`transition ${playable ? "cursor-pointer drop-shadow-[0_0_10px_rgba(167,139,250,0.6)]" : "opacity-50 saturate-50"}`}
              >
                <CardFace card={card} />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Wild color picker */}
      <AnimatePresence>
        {pendingWildIdx !== null && (
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
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => chooseWildColor(c)}
                    className="rounded-xl py-4 text-sm font-black uppercase tracking-wider text-white transition hover:scale-105"
                    style={{ backgroundColor: COLOR_HEX[c], boxShadow: `0 4px 14px ${COLOR_HEX[c]}66` }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {pendingWildIdx !== -1 && (
                <button
                  onClick={() => setPendingWildIdx(null)}
                  className="mt-4 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function UnoPage() {
  return (
    <div>
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Back to games
      </Link>
      <GameGate<Record<string, never>> slug="uno">{() => <UnoGame />}</GameGate>
    </div>
  );
}
