"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ScoreResult } from "@/lib/types";
import { useUser } from "@/components/UserProvider";

/**
 * Submits a finished run's score exactly once. Call `reset()` before a new run.
 */
export function useScoreSubmit(slug: string) {
  const { refresh } = useUser();
  const submittedRef = useRef(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (score: number, durationSeconds?: number, metadata?: Record<string, unknown>) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const body: Record<string, unknown> = {
          score: Math.max(0, Math.min(10000, Math.round(score))),
        };
        if (durationSeconds !== undefined) body.durationSeconds = Math.max(0, Math.round(durationSeconds));
        if (metadata) body.metadata = metadata;
        const r = await api<ScoreResult>(`/api/games/${slug}/scores`, { method: "POST", body });
        setResult(r);
        void refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit score");
      } finally {
        setSubmitting(false);
      }
    },
    [slug, refresh]
  );

  const reset = useCallback(() => {
    submittedRef.current = false;
    setResult(null);
    setError(null);
  }, []);

  return { result, error, submitting, submit, reset };
}
