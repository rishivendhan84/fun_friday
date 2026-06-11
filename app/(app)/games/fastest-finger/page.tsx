"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Timer, X, Zap } from "lucide-react";
import type { FastestFingerContent } from "@/lib/types";
import GameGate from "@/components/GameGate";
import GameResults from "@/components/GameResults";
import { useScoreSubmit } from "@/lib/useScoreSubmit";

type Phase = "intro" | "playing" | "results";

function Quiz({ content }: { content: FastestFingerContent }) {
  const { questions, secondsPerQuestion } = content;
  const { result, error, submitting, submit, reset } = useScoreSubmit("fastest-finger");

  const [phase, setPhase] = useState<Phase>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [remaining, setRemaining] = useState(secondsPerQuestion);
  const [picked, setPicked] = useState<number | null>(null);
  const startedAtRef = useRef(0);
  const questionStartRef = useRef(0);

  const finish = useCallback(
    (finalScore: number) => {
      setPhase("results");
      void submit(finalScore, Math.round((Date.now() - startedAtRef.current) / 1000));
    },
    [submit]
  );

  const advance = useCallback(
    (newScore: number, newCorrect: number) => {
      if (qIndex + 1 >= questions.length) {
        finish(newScore);
      } else {
        setQIndex(qIndex + 1);
        setPicked(null);
        setRemaining(secondsPerQuestion);
        questionStartRef.current = Date.now();
      }
      setScore(newScore);
      setCorrectCount(newCorrect);
    },
    [qIndex, questions.length, secondsPerQuestion, finish]
  );

  // Per-question countdown
  useEffect(() => {
    if (phase !== "playing" || picked !== null) return;
    const id = setInterval(() => {
      const left = secondsPerQuestion - (Date.now() - questionStartRef.current) / 1000;
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(id);
        setPicked(-1); // timed out
        setTimeout(() => advance(score, correctCount), 900);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, picked, qIndex, secondsPerQuestion, advance, score, correctCount]);

  function start() {
    reset();
    setPhase("playing");
    setQIndex(0);
    setScore(0);
    setCorrectCount(0);
    setPicked(null);
    setRemaining(secondsPerQuestion);
    startedAtRef.current = Date.now();
    questionStartRef.current = Date.now();
  }

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const q = questions[qIndex];
    const isCorrect = i === q.answer;
    const secsLeft = Math.max(0, Math.floor(secondsPerQuestion - (Date.now() - questionStartRef.current) / 1000));
    const gained = isCorrect ? 20 + Math.min(secsLeft, secondsPerQuestion) * 3 : 0;
    setTimeout(() => advance(score + gained, correctCount + (isCorrect ? 1 : 0)), 900);
  }

  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass mx-auto mt-10 max-w-md rounded-2xl p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
          <Zap size={30} />
        </div>
        <h2 className="text-xl font-bold text-white">Fastest Finger</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {questions.length} questions, {secondsPerQuestion}s each. Correct answers earn{" "}
          <span className="font-semibold text-cyan-300">20 pts + 3 per second left</span>. Speed wins.
        </p>
        <button
          onClick={start}
          className="mt-6 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-600/30 transition hover:brightness-110"
        >
          Start quiz
        </button>
      </motion.div>
    );
  }

  if (phase === "results") {
    return (
      <GameResults
        title="Quiz complete!"
        score={score}
        stats={[
          ["Correct", `${correctCount}/${questions.length}`],
          ["Accuracy", `${Math.round((correctCount / questions.length) * 100)}%`],
        ]}
        result={result}
        error={error}
        submitting={submitting}
        onPlayAgain={start}
      />
    );
  }

  const q = questions[qIndex];
  const timePct = (remaining / secondsPerQuestion) * 100;

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-zinc-400">
          Question <span className="text-white">{qIndex + 1}</span> / {questions.length}
        </span>
        <motion.span
          key={score}
          initial={{ scale: 1.3, color: "#34d399" }}
          animate={{ scale: 1, color: "#ffffff" }}
          className="font-mono text-lg font-black"
        >
          {score} pts
        </motion.span>
      </div>

      {/* Timer bar */}
      <div className="mb-2 flex items-center gap-2">
        <Timer size={14} className={timePct < 30 ? "text-red-400" : "text-cyan-300"} />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${
              timePct < 30 ? "bg-red-500" : "bg-gradient-to-r from-cyan-400 to-violet-500"
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>
        <span className="w-8 text-right font-mono text-sm font-bold text-zinc-300">{Math.ceil(remaining)}s</span>
      </div>

      {/* Progress dots */}
      <div className="mb-6 flex gap-1">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < qIndex ? "bg-violet-500" : i === qIndex ? "bg-cyan-400" : "bg-white/10"}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <div className="glass mb-5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white sm:text-xl">{q.q}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              const revealed = picked !== null;
              const isAnswer = i === q.answer;
              const isPicked = i === picked;
              let cls = "glass glass-hover border-white/10";
              if (revealed && isAnswer) cls = "border-green-500/70 bg-green-500/15";
              else if (revealed && isPicked && !isAnswer) cls = "border-red-500/70 bg-red-500/15";
              else if (revealed) cls = "glass opacity-50";
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={revealed}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-semibold text-white transition ${cls}`}
                >
                  <span>
                    <span className="mr-2 text-zinc-500">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </span>
                  {revealed && isAnswer && <Check size={18} className="text-green-400" />}
                  {revealed && isPicked && !isAnswer && <X size={18} className="text-red-400" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function FastestFingerPage() {
  return (
    <div>
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Back to games
      </Link>
      <GameGate<FastestFingerContent> slug="fastest-finger">
        {(content) => <Quiz content={content} />}
      </GameGate>
    </div>
  );
}
