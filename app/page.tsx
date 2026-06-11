"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Loader2, Radio } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Department, FunFridayStatus, User } from "@/lib/types";
import CountdownTimer from "@/components/CountdownTimer";

type Tab = "login" | "register";

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [status, setStatus] = useState<FunFridayStatus | null>(null);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ user: User }>("/api/auth/me", { noAuthRedirect: true })
      .then(() => router.replace("/dashboard"))
      .catch(() => setChecking(false));
    api<{ departments: Department[] }>("/api/departments", { noAuthRedirect: true })
      .then((d) => setDepartments(d.departments))
      .catch(() => {});
    api<FunFridayStatus>("/api/fun-friday/status", { noAuthRedirect: true })
      .then(setStatus)
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === "login") {
        await api<{ user: User }>("/api/auth/login", {
          method: "POST",
          body: { email, password },
          noAuthRedirect: true,
        });
      } else {
        await api<{ user: User }>("/api/auth/register", {
          method: "POST",
          body: {
            email,
            password,
            name,
            ...(departmentId ? { departmentId: Number(departmentId) } : {}),
          },
          noAuthRedirect: true,
        });
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500/60 focus:bg-white/[0.07]";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.15 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/40"
          >
            <Gamepad2 size={32} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight">
            Fun Friday <span className="text-gradient">— The Arena</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">Play. Score. Climb. Every Friday, 5:00–5:30 PM.</p>
        </div>

        {status && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass mb-6 flex items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm"
          >
            {status.active ? (
              <>
                <span className="pulse-glow flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">
                  <Radio size={12} /> LIVE NOW
                </span>
                <span className="text-zinc-300">
                  The Arena is open{status.secondsToEnd > 0 && (
                    <>
                      {" — closes in "}
                      <CountdownTimer seconds={status.secondsToEnd} className="font-mono font-bold text-green-400" />
                    </>
                  )}
                </span>
              </>
            ) : (
              <span className="text-zinc-300">
                Next Fun Friday in{" "}
                <CountdownTimer seconds={status.secondsToStart} className="font-mono font-bold text-violet-300" />
              </span>
            )}
          </motion.div>
        )}

        <div className="glass rounded-2xl p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  tab === t ? "bg-violet-600 text-white shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {tab === "register" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <input
                    className={inputCls}
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <select
                    className={`${inputCls} appearance-none`}
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    <option value="" className="bg-[#14141f]">
                      Select department (optional)
                    </option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#14141f]">
                        {d.name}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              className={inputCls}
              type="email"
              placeholder="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className={inputCls}
              type="password"
              placeholder={tab === "register" ? "Password (min 8 characters)" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={tab === "register" ? 8 : undefined}
              required
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {tab === "login" ? "Enter the Arena" : "Join the Arena"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
