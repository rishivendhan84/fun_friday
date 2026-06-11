"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import type { WordSearchContent } from "@/lib/types";
import GameGate from "@/components/GameGate";
import GameResults from "@/components/GameResults";
import { useScoreSubmit } from "@/lib/useScoreSubmit";

type Phase = "intro" | "playing" | "results";

interface Placed {
  word: string;
  cells: string[]; // "r,c"
}

const DIRS: [number, number][] = [
  [0, 1], // right
  [1, 0], // down
  [1, 1], // down-right
  [1, -1], // down-left
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateGrid(words: string[], size: number): { grid: string[][]; placed: Placed[] } {
  // Retry whole-grid generation until every word fits (small grids, fast).
  for (let attempt = 0; attempt < 50; attempt++) {
    const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
    const placed: Placed[] = [];
    let ok = true;

    for (const word of words) {
      let done = false;
      for (let tries = 0; tries < 300 && !done; tries++) {
        const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
        const reversed = Math.random() < 0.35;
        const w = reversed ? [...word].reverse().join("") : word;
        const r0 = Math.floor(Math.random() * size);
        const c0 = Math.floor(Math.random() * size);
        const rEnd = r0 + dr * (w.length - 1);
        const cEnd = c0 + dc * (w.length - 1);
        if (rEnd < 0 || rEnd >= size || cEnd < 0 || cEnd >= size) continue;
        let fits = true;
        for (let i = 0; i < w.length; i++) {
          const cell = grid[r0 + dr * i][c0 + dc * i];
          if (cell !== null && cell !== w[i]) {
            fits = false;
            break;
          }
        }
        if (!fits) continue;
        const cells: string[] = [];
        for (let i = 0; i < w.length; i++) {
          grid[r0 + dr * i][c0 + dc * i] = w[i];
          cells.push(`${r0 + dr * i},${c0 + dc * i}`);
        }
        placed.push({ word, cells });
        done = true;
      }
      if (!done) {
        ok = false;
        break;
      }
    }

    if (ok) {
      const filled = grid.map((row) => row.map((c) => c ?? LETTERS[Math.floor(Math.random() * LETTERS.length)]));
      return { grid: filled, placed };
    }
  }
  // Should never happen for 6 short words on a 10x10 grid
  throw new Error("Could not generate grid");
}

function cellsBetween(a: [number, number], b: [number, number]): string[] | null {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(`${a[0] + sr * i},${a[1] + sc * i}`);
  return out;
}

function WordSearch({ content }: { content: WordSearchContent }) {
  const { gridSize, durationSeconds, wordSets } = content;
  const { result, error, submitting, submit, reset } = useScoreSubmit("word-search");

  const [phase, setPhase] = useState<Phase>("intro");
  const [words, setWords] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>([]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [dragStart, setDragStart] = useState<[number, number] | null>(null);
  const [hovered, setHovered] = useState<[number, number] | null>(null);
  const [remaining, setRemaining] = useState(durationSeconds);
  const [finalScore, setFinalScore] = useState(0);
  const startedAtRef = useRef(0);
  const draggingRef = useRef(false);

  const finish = useCallback(
    (foundCount: number, allFound: boolean) => {
      const elapsed = Math.min(durationSeconds, Math.round((Date.now() - startedAtRef.current) / 1000));
      const timeBonus = allFound ? Math.max(0, durationSeconds - elapsed) : 0;
      const score = foundCount * 50 + timeBonus;
      setFinalScore(score);
      setPhase("results");
      void submit(score, elapsed);
    },
    [durationSeconds, submit]
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      const left = durationSeconds - (Date.now() - startedAtRef.current) / 1000;
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(id);
        finish(found.size, false);
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, durationSeconds, finish, found.size]);

  function start() {
    reset();
    const set = wordSets[Math.floor(Math.random() * wordSets.length)];
    const { grid: g, placed: p } = generateGrid(set, gridSize);
    setWords(set);
    setGrid(g);
    setPlaced(p);
    setFound(new Set());
    setFoundCells(new Set());
    setDragStart(null);
    setHovered(null);
    setRemaining(durationSeconds);
    startedAtRef.current = Date.now();
    setPhase("playing");
  }

  const selection = useMemo(() => {
    if (!dragStart || !hovered) return new Set<string>();
    const cells = cellsBetween(dragStart, hovered);
    return new Set(cells ?? [`${dragStart[0]},${dragStart[1]}`]);
  }, [dragStart, hovered]);

  function trySelect(start: [number, number], end: [number, number]) {
    const cells = cellsBetween(start, end);
    if (!cells) return;
    const fwd = cells.map((k) => {
      const [r, c] = k.split(",").map(Number);
      return grid[r][c];
    }).join("");
    const rev = [...fwd].reverse().join("");
    for (const p of placed) {
      if (found.has(p.word)) continue;
      if (p.word === fwd || p.word === rev) {
        const newFound = new Set(found).add(p.word);
        setFound(newFound);
        setFoundCells((prev) => {
          const next = new Set(prev);
          for (const k of cells) next.add(k);
          return next;
        });
        if (newFound.size === words.length) finish(newFound.size, true);
        return;
      }
    }
  }

  function onPointerDown(r: number, c: number) {
    draggingRef.current = true;
    setDragStart([r, c]);
    setHovered([r, c]);
  }

  function onPointerEnter(r: number, c: number) {
    if (draggingRef.current) setHovered([r, c]);
  }

  function onPointerUp() {
    if (draggingRef.current && dragStart && hovered) {
      trySelect(dragStart, hovered);
    }
    draggingRef.current = false;
    setDragStart(null);
    setHovered(null);
  }

  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass mx-auto mt-10 max-w-md rounded-2xl p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <Search size={30} />
        </div>
        <h2 className="text-xl font-bold text-white">Word Search</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Six words are hidden in a {gridSize}×{gridSize} grid — across, down and diagonal (sometimes backwards). Drag
          across letters to select. <span className="font-semibold text-emerald-300">50 pts per word</span>, plus a time
          bonus if you find them all. {Math.round(durationSeconds / 60)} minutes on the clock.
        </p>
        <button
          onClick={start}
          className="mt-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:brightness-110"
        >
          Start searching
        </button>
      </motion.div>
    );
  }

  if (phase === "results") {
    return (
      <GameResults
        title={found.size === words.length ? "All words found!" : "Time's up!"}
        score={finalScore}
        stats={[
          ["Words found", `${found.size}/${words.length}`],
          ["Time used", `${Math.min(durationSeconds, Math.round((Date.now() - startedAtRef.current) / 1000))}s`],
        ]}
        result={result}
        error={error}
        submitting={submitting}
        onPlayAgain={start}
      />
    );
  }

  const timePct = (remaining / durationSeconds) * 100;

  return (
    <div className="mx-auto mt-6 max-w-3xl" onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${
              timePct < 20 ? "bg-red-500" : "bg-gradient-to-r from-emerald-400 to-cyan-400"
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>
        <span className="w-12 text-right font-mono text-sm font-bold text-zinc-300">
          {Math.floor(remaining / 60)}:{String(Math.ceil(remaining) % 60).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-col gap-5 md:flex-row">
        {/* Grid */}
        <div className="glass no-select flex-1 rounded-2xl p-3 sm:p-4" style={{ touchAction: "none" }}>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {grid.map((row, r) =>
              row.map((letter, c) => {
                const key = `${r},${c}`;
                const isFound = foundCells.has(key);
                const isSelected = selection.has(key);
                return (
                  <button
                    key={key}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      // release implicit capture so pointerenter fires on other cells (touch)
                      e.currentTarget.releasePointerCapture(e.pointerId);
                      onPointerDown(r, c);
                    }}
                    onPointerEnter={() => onPointerEnter(r, c)}
                    className={`flex aspect-square items-center justify-center rounded-md text-xs font-bold transition-colors sm:rounded-lg sm:text-base ${
                      isSelected
                        ? "bg-cyan-400 text-black"
                        : isFound
                          ? "bg-emerald-500/30 text-emerald-300"
                          : "bg-white/[0.04] text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {letter}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Word list */}
        <div className="glass w-full rounded-2xl p-5 md:w-52">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
            Find ({found.size}/{words.length})
          </h3>
          <ul className="grid grid-cols-3 gap-2 md:grid-cols-1">
            {words.map((w) => {
              const isFound = found.has(w);
              return (
                <li
                  key={w}
                  className={`rounded-lg px-3 py-1.5 text-center font-mono text-sm font-bold transition md:text-left ${
                    isFound ? "bg-emerald-500/15 text-emerald-400 line-through opacity-70" : "bg-white/5 text-white"
                  }`}
                >
                  {w}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 hidden text-xs text-zinc-500 md:block">
            Tip: drag from the first letter to the last. Backwards counts too.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WordSearchPage() {
  return (
    <div>
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Back to games
      </Link>
      <GameGate<WordSearchContent> slug="word-search">{(content) => <WordSearch content={content} />}</GameGate>
    </div>
  );
}
