"use client";

import { useEffect, useState } from "react";

function format(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface CountdownTimerProps {
  seconds: number;
  onComplete?: () => void;
  className?: string;
}

/** Ticks down locally from an initial seconds value. */
export default function CountdownTimer({ seconds, onComplete, className }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const startedAt = Date.now();
    const id = setInterval(() => {
      const left = seconds - (Date.now() - startedAt) / 1000;
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  return <span className={className}>{format(remaining)}</span>;
}
