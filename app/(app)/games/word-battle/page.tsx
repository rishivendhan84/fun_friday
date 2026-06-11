"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Flame, Keyboard } from "lucide-react";
import type { WordBattleContent } from "@/lib/types";
import GameGate from "@/components/GameGate";
import GameResults from "@/components/GameResults";
import { useScoreSubmit } from "@/lib/useScoreSubmit";

type Phase = "intro" | "playing" | "results";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Battle({ content }: { content: WordBattleContent }) {
  const { durationSeconds } = content;
  const { result, error, submitting, submit, reset } = useScoreSubmit("word-battle");

  const [phase, setPhase] = useState<Phase>("intro");
  const [queue, setQueue] = useState<string[]>([]);
  const [wordIdx, setWordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [correct, setCorrect] = useState(0);
  const [misses, setMisses] = useState(0);
  const [bestCombo, setBestCombo] = useState(1);
  const [remaining, setRemaining] = useState(durationSeconds);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const startedAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scoreRef = useRef(0);

  const finish = useCallback(() => {
    setPhase("results");
    void submit(scoreRef.current, durationSeconds);
  }, [submit, durationSeconds]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      const left = durationSeconds - (Date.now() - startedAtRef.current) / 1000;
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(id);
        finish();
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, durationSeconds, finish]);

  function start() {
    reset();
    setQueue(shuffle(content.words));
    setWordIdx(0);
    setTyped("");
    setScore(0);
    scoreRef.current = 0;
    setMultiplier(1);
    setCorrect(0);
    setMisses(0);
    setBestCombo(1);
    setRemaining(durationSeconds);
    startedAtRef.current = Date.now();
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function submitWord() {
    const target = queue[wordIdx % queue.length];
    const attempt = typed.trim();
    if (!attempt) return;
    if (attempt.toLowerCase() === target.toLowerCase()) {
      const gained = 10 * multiplier;
      setScore((s) => {
        scoreRef.current = s + gained;
        return s + gained;
      });
      setCorrect((c) => c + 1);
      setMultiplier((m) => {
        const next = Math.min(5, m + 1);
        setBestCombo((b) => Math.max(b, next));
        return next;
      });
      setFlash("hit");
    } else {
      setMisses((m) => m + 1);
      setMultiplier(1);
      setFlash("miss");
    }
    setTyped("");
    setWordIdx((i) => i + 1);
    setTimeout(() => setFlash(null), 250);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      submitWord();
    }
  }

  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass mx-auto mt-10 max-w-md rounded-2xl p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
          <Keyboard size={30} />
        </div>
        <h2 className="text-xl font-bold text-white">Word Battle</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Type each word and hit <span className="font-semibold text-white">Enter</span> or{" "}
          <span className="font-semibold text-white">Space</span>. {durationSeconds} seconds on the clock. Correct words
          earn <span className="font-semibold text-fuchsia-300">10 pts × combo</span> (up to ×5). A typo resets your
          combo.
        </p>
        <button
          onClick={start}
          className="mt-6 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-600/30 transition hover:brightness-110"
        >
          Start typing
        </button>
      </motion.div>
    );
  }

  if (phase === "results") {
    const wpm = Math.round(correct / (durationSeconds / 60));
    return (
      <GameResults
        title="Time's up!"
        score={score}
        stats={[
          ["Words", String(correct)],
          ["WPM", String(wpm)],
          ["Misses", String(misses)],
          ["Best combo", `×${bestCombo}`],
        ]}
        result={result}
        error={error}
        submitting={submitting}
        onPlayAgain={start}
      />
    );
  }

  const target = queue[wordIdx % queue.length] ?? "";
  const timePct = (remaining / durationSeconds) * 100;
  const elapsedMin = Math.max(1 / 60, (Date.now() - startedAtRef.current) / 60000);
  const liveWpm = Math.round(correct / elapsedMin);

  return (
    <div className="mx-auto mt-6 max-w-xl">
      {/* Timer bar */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${
              timePct < 20 ? "bg-red-500" : "bg-gradient-to-r from-fuchsia-500 to-cyan-400"
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>
        <span className="w-10 text-right font-mono text-sm font-bold text-zinc-300">{Math.ceil(remaining)}s</span>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-4 gap-2 text-center">
        {[
          ["Score", score.toLocaleString()],
          ["Combo", `×${multiplier}`],
          ["Words", String(correct)],
          ["WPM", String(liveWpm)],
        ].map(([label, value]) => (
          <div key={label} className="glass rounded-xl px-2 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
            <p
              className={`font-mono text-lg font-black ${
                label === "Combo" && multiplier >= 5 ? "text-amber-300" : "text-white"
              }`}
            >
              {label === "Combo" && multiplier >= 5 ? (
                <span className="inline-flex items-center gap-1">
                  <Flame size={15} /> {value}
                </span>
              ) : (
                value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Current word */}
      <motion.div
        animate={
          flash === "hit"
            ? { borderColor: "rgba(52,211,153,0.8)", scale: 1.02 }
            : flash === "miss"
              ? { borderColor: "rgba(239,68,68,0.8)", x: [0, -6, 6, -4, 0] }
              : { borderColor: "rgba(255,255,255,0.1)", scale: 1 }
        }
        transition={{ duration: 0.25 }}
        className="glass mb-5 rounded-2xl border p-8 text-center"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={wordIdx}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.15 }}
            className="text-4xl font-black tracking-wide sm:text-5xl"
          >
            {target.split("").map((ch, i) => {
              const t = typed[i];
              const cls = t === undefined ? "text-white" : t.toLowerCase() === ch.toLowerCase() ? "text-green-400" : "text-red-400";
              return (
                <span key={i} className={cls}>
                  {ch}
                </span>
              );
            })}
          </motion.p>
        </AnimatePresence>
        <p className="mt-3 text-xs text-zinc-500">
          Next: <span className="font-semibold text-zinc-400">{queue[(wordIdx + 1) % queue.length]}</span>
        </p>
      </motion.div>

      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Type the word..."
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center font-mono text-xl text-white outline-none transition focus:border-fuchsia-500/60"
      />
    </div>
  );
}

export default function WordBattlePage() {
  return (
    <div>
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Back to games
      </Link>
      <GameGate<WordBattleContent> slug="word-battle">{(content) => <Battle content={content} />}</GameGate>
    </div>
  );
}
