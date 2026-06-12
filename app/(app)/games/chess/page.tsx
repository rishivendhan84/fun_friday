"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Crown, Flag, ShieldAlert } from "lucide-react";
import { Chess, type Square } from "chess.js";
import GameGate from "@/components/GameGate";
import OnlinePlayers from "@/components/OnlinePlayers";
import MultiplayerResults from "@/components/MultiplayerResults";
import Avatar from "@/components/Avatar";
import { useRealtime } from "@/lib/realtime";
import { useUser } from "@/components/UserProvider";
import type { ChessSide, ChessState, MultiplayerContent } from "@/lib/types";

/* ---------------- Board ---------------- */

const FILES = "abcdefgh";
const PIECE_GLYPH: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const LIGHT_SQ = "#777199";
const DARK_SQ = "#46415f";

const SIDE_LABEL: Record<ChessSide, string> = { w: "White", b: "Black" };

function ChessLive({ state }: { state: ChessState }) {
  const { user } = useUser();
  const { chessMove, chessResign } = useRealtime();
  const chess = useMemo(() => new Chess(state.fen), [state.fen]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);

  const flipped = state.yourColor === "b";
  const myTurn = state.turn === state.yourColor && state.result === null;

  const legalTargets = useMemo(() => {
    if (!selected || !myTurn) return new Set<string>();
    return new Set(chess.moves({ square: selected, verbose: true }).map((m) => m.to));
  }, [chess, selected, myTurn]);

  function squareAt(row: number, col: number): Square {
    const file = flipped ? 7 - col : col;
    const rank = flipped ? row + 1 : 8 - row;
    return `${FILES[file]}${rank}` as Square;
  }

  function onSquareClick(sq: Square) {
    if (!myTurn) return;
    if (selected && legalTargets.has(sq)) {
      const move = chess.moves({ square: selected, verbose: true }).find((m) => m.to === sq);
      chessMove(selected, sq, move?.promotion ? "q" : undefined);
      setSelected(null);
      return;
    }
    const piece = chess.get(sq);
    if (piece && piece.color === state.yourColor) {
      setSelected((cur) => (cur === sq ? null : sq));
      return;
    }
    setSelected(null);
  }

  const turnPlayer = state.players.find((p) => p.color === state.turn);

  return (
    <div className="mx-auto mt-4 max-w-2xl">
      {/* Players */}
      <div className="grid grid-cols-2 gap-3">
        {state.players.map((p) => {
          const isTurn = p.color === state.turn && state.result === null;
          const isYou = p.id === user?.id;
          return (
            <div
              key={p.id}
              className={`glass flex items-center gap-3 rounded-2xl p-3 transition ${
                isTurn ? "border-cyan-400/60 shadow-lg shadow-cyan-500/10" : ""
              }`}
            >
              <Avatar name={p.name} color={p.avatarColor} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {p.name}
                  {isYou && <span className="ml-1 text-xs font-normal text-zinc-500">(you)</span>}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[11px] ${
                      p.color === "w" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-100 ring-1 ring-white/30"
                    }`}
                  >
                    ♚
                  </span>
                  {SIDE_LABEL[p.color]}
                </p>
              </div>
              {isTurn && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400 shadow shadow-cyan-400" />}
            </div>
          );
        })}
      </div>

      {/* Status line */}
      <div className="my-3 flex min-h-8 items-center justify-center gap-3 text-sm text-zinc-300">
        {state.check && state.result === null && (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-black uppercase tracking-widest text-red-400"
          >
            <ShieldAlert size={13} /> Check
          </motion.span>
        )}
        <span>
          {myTurn ? (
            <span className="font-semibold text-cyan-300">Your move</span>
          ) : (
            <>Waiting for {turnPlayer?.name ?? "opponent"}…</>
          )}
        </span>
      </div>

      {/* Board */}
      <div className="glass mx-auto max-w-[560px] overflow-hidden rounded-2xl p-2 sm:p-3">
        <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-xl">
          {Array.from({ length: 64 }).map((_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const sq = squareAt(row, col);
            const fileIdx = FILES.indexOf(sq[0]);
            const rank = Number(sq[1]);
            const isDark = (fileIdx + rank) % 2 === 1;
            const piece = chess.get(sq);
            const isSelected = selected === sq;
            const isTarget = legalTargets.has(sq);
            const isLastMove = state.lastMove !== null && (state.lastMove.from === sq || state.lastMove.to === sq);
            const clickable = myTurn && (isTarget || (piece && piece.color === state.yourColor));

            return (
              <button
                key={sq}
                onClick={() => onSquareClick(sq)}
                aria-label={sq}
                className={`relative flex items-center justify-center select-none ${
                  clickable ? "cursor-pointer" : "cursor-default"
                }`}
                style={{ backgroundColor: isDark ? DARK_SQ : LIGHT_SQ }}
              >
                {isLastMove && <span className="absolute inset-0 bg-cyan-400/25" />}
                {isSelected && <span className="absolute inset-0 bg-violet-500/45 ring-2 ring-inset ring-violet-300" />}
                {isTarget &&
                  (piece ? (
                    <span className="absolute inset-0 rounded-sm ring-[3px] ring-inset ring-fuchsia-400/80" />
                  ) : (
                    <span className="absolute h-[22%] w-[22%] rounded-full bg-fuchsia-400/70" />
                  ))}
                {/* coordinates */}
                {col === 0 && (
                  <span className="absolute left-0.5 top-0.5 text-[9px] font-bold text-white/40">{sq[1]}</span>
                )}
                {row === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white/40">{sq[0]}</span>
                )}
                {piece && (
                  <span
                    className="relative z-10 text-[clamp(26px,5.4vw,44px)] leading-none"
                    style={
                      piece.color === "w"
                        ? { color: "#f8fafc", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.55))" }
                        : { color: "#16121f", filter: "drop-shadow(0 1px 1px rgba(255,255,255,0.25))" }
                    }
                  >
                    {PIECE_GLYPH[piece.type]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Move history + resign */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="glass flex-1 overflow-x-auto rounded-xl px-3 py-2.5">
          {state.history.length === 0 ? (
            <p className="text-xs text-zinc-500">No moves yet — {SIDE_LABEL[state.turn]} to move.</p>
          ) : (
            <div className="flex items-center gap-2 whitespace-nowrap font-mono text-xs text-zinc-300">
              {state.history.map((san, i) => (
                <span key={`${i}-${san}`} className={i === state.history.length - 1 ? "rounded bg-cyan-500/20 px-1.5 py-0.5 font-bold text-cyan-300" : ""}>
                  {i % 2 === 0 && <span className="mr-1 text-zinc-600">{Math.floor(i / 2) + 1}.</span>}
                  {san}
                </span>
              ))}
            </div>
          )}
        </div>
        {confirmResign ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Resign?</span>
            <button
              onClick={() => {
                chessResign();
                setConfirmResign(false);
              }}
              className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/30"
            >
              Yes, resign
            </button>
            <button
              onClick={() => setConfirmResign(false)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmResign(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
          >
            <Flag size={13} /> Resign
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Lobby ---------------- */

function ChessLobby() {
  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
          <Crown size={26} />
        </div>
        <h1 className="text-2xl font-black text-white">Live Chess</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Challenge a colleague to a head-to-head match. Win for XP, coins and bragging rights.
        </p>
      </motion.div>
      <OnlinePlayers games={["chess"]} />
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function ChessPage() {
  const { currentGame, lastGameOver, clearLastGameOver } = useRealtime();

  if (currentGame && currentGame.game === "chess") {
    return (
      <div>
        <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={15} /> Back to games
        </Link>
        <AnimatePresence>
          <ChessLive state={currentGame.state} />
        </AnimatePresence>
      </div>
    );
  }

  if (lastGameOver && lastGameOver.state.game === "chess") {
    return <MultiplayerResults payload={lastGameOver} onPlayAgain={clearLastGameOver} />;
  }

  return (
    <div>
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Back to games
      </Link>
      <GameGate<MultiplayerContent> slug="chess">{() => <ChessLobby />}</GameGate>
    </div>
  );
}
