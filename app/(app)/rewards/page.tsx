"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gift, Loader2, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Redemption, Reward, RewardsResponse, SpinResult } from "@/lib/types";
import Icon from "@/components/Icon";
import { useUser } from "@/components/UserProvider";
import { timeAgo } from "@/lib/format";

// Mirrors the backend wheel (prizeIndex maps to these segments)
const WHEEL_SEGMENTS = [
  { label: "25 coins", color: "#8b5cf6" },
  { label: "50 coins", color: "#22d3ee" },
  { label: "75 XP", color: "#e879f9" },
  { label: "100 coins", color: "#34d399" },
  { label: "150 XP", color: "#f472b6" },
  { label: "JACKPOT", color: "#f59e0b" },
];
const SEG_ANGLE = 360 / WHEEL_SEGMENTS.length;

export default function RewardsPage() {
  const { refresh } = useUser();
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [coins, setCoins] = useState(0);

  // wheel state
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinMessage, setSpinMessage] = useState<string | null>(null);
  const [spinPrize, setSpinPrize] = useState<SpinResult["prize"] | null>(null);
  const [pendingSpin, setPendingSpin] = useState<SpinResult | null>(null);

  // shop state
  const [confirming, setConfirming] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [shopMessage, setShopMessage] = useState<string | null>(null);

  useEffect(() => {
    api<RewardsResponse>("/api/rewards")
      .then((d) => {
        setData(d);
        setCoins(d.coins);
      })
      .catch(() => {});
  }, []);

  async function spin() {
    if (spinning) return;
    setSpinMessage(null);
    setSpinPrize(null);
    try {
      const r = await api<SpinResult>("/api/rewards/spin", { method: "POST" });
      setPendingSpin(r);
      setSpinning(true);
      // land the winning segment's center under the top pointer
      const target = 360 * 5 + (360 - (r.prizeIndex * SEG_ANGLE + SEG_ANGLE / 2));
      setRotation((prev) => prev + target - (prev % 360));
    } catch (e) {
      setSpinMessage(e instanceof ApiError ? e.message : "Spin failed");
    }
  }

  function onSpinDone() {
    if (!pendingSpin) return;
    setSpinning(false);
    setSpinPrize(pendingSpin.prize);
    setCoins(pendingSpin.totals.coins);
    setPendingSpin(null);
    void refresh();
  }

  async function redeem(reward: Reward) {
    setRedeeming(true);
    setShopMessage(null);
    try {
      const r = await api<{ reward: { id: number; name: string }; coins: number }>(
        `/api/rewards/${reward.id}/redeem`,
        { method: "POST" }
      );
      setCoins(r.coins);
      setShopMessage(`Redeemed ${r.reward.name}!`);
      // refresh rewards + redemptions
      const fresh = await api<RewardsResponse>("/api/rewards");
      setData(fresh);
      setCoins(fresh.coins);
      void refresh();
    } catch (e) {
      setShopMessage(e instanceof ApiError ? e.message : "Redeem failed");
    } finally {
      setRedeeming(false);
      setConfirming(null);
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center pt-24">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Rewards</h1>
          <p className="mt-1 text-sm text-zinc-400">Spend your hard-won coins. Spin once per Fun Friday.</p>
        </div>
        <motion.div
          key={coins}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 self-start rounded-2xl bg-amber-500/15 px-5 py-3 text-lg font-black text-amber-300"
        >
          <Coins size={20} /> {coins.toLocaleString()}
        </motion.div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Spin the wheel */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass flex flex-col items-center rounded-2xl p-6 lg:col-span-2"
        >
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-300">Spin the Wheel</h2>

          <div className="relative mb-5">
            {/* pointer */}
            <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2">
              <div className="h-0 w-0 border-x-[10px] border-t-[16px] border-x-transparent border-t-white drop-shadow" />
            </div>
            <motion.div
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: [0.12, 0.8, 0.18, 1] }}
              onAnimationComplete={onSpinDone}
              className="relative h-56 w-56 rounded-full border-4 border-white/20 sm:h-64 sm:w-64"
              style={{
                background: `conic-gradient(${WHEEL_SEGMENTS.map(
                  (s, i) => `${s.color} ${i * SEG_ANGLE}deg ${(i + 1) * SEG_ANGLE}deg`
                ).join(", ")})`,
              }}
            >
              {WHEEL_SEGMENTS.map((s, i) => (
                <div
                  key={s.label}
                  className="absolute inset-0 flex justify-center"
                  style={{ transform: `rotate(${i * SEG_ANGLE + SEG_ANGLE / 2}deg)` }}
                >
                  <span className="mt-4 max-w-16 text-center text-[10px] font-black uppercase leading-tight text-black/70">
                    {s.label}
                  </span>
                </div>
              ))}
              <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/30 bg-[#0a0a14]">
                <Sparkles size={18} className="text-amber-300" />
              </div>
            </motion.div>
          </div>

          <button
            onClick={spin}
            disabled={spinning}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-fuchsia-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-amber-600/30 transition hover:brightness-110 disabled:opacity-60"
          >
            {spinning ? "Spinning..." : "Spin!"}
          </button>

          <AnimatePresence>
            {spinPrize && (
              <motion.p
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-xl bg-amber-500/15 px-4 py-2.5 text-center text-sm font-bold text-amber-300"
              >
                You won {spinPrize.label}!
              </motion.p>
            )}
          </AnimatePresence>
          {spinMessage && (
            <p className="mt-4 rounded-xl bg-white/5 px-4 py-2.5 text-center text-sm text-zinc-300">{spinMessage}</p>
          )}
        </motion.section>

        {/* Shop */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-6 lg:col-span-3"
        >
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-300">Coin Shop</h2>
          {shopMessage && (
            <p className="mb-4 rounded-xl bg-violet-500/10 px-4 py-2.5 text-sm text-violet-200">{shopMessage}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {data.rewards.map((r) => {
              const affordable = coins >= r.cost_coins;
              const inStock = r.stock > 0;
              const enabled = affordable && inStock;
              return (
                <div key={r.id} className="glass flex flex-col rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                      <Icon name={r.icon} size={22} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-white">{r.name}</p>
                      <p className="text-xs text-zinc-400">{r.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                      <Coins size={14} /> {r.cost_coins.toLocaleString()}
                    </span>
                    <span className={`text-xs ${inStock ? "text-zinc-500" : "font-bold text-red-400"}`}>
                      {inStock ? `${r.stock} left` : "Out of stock"}
                    </span>
                    <button
                      onClick={() => setConfirming(r)}
                      disabled={!enabled}
                      className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                        enabled
                          ? "bg-violet-600 text-white hover:brightness-110"
                          : "cursor-not-allowed bg-white/5 text-zinc-500"
                      }`}
                    >
                      {!inStock ? "Sold out" : affordable ? "Redeem" : "Too pricey"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>

      {/* My redemptions */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6"
      >
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
          <Gift size={15} /> My redemptions
        </h2>
        {data.redemptions.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">Nothing redeemed yet. Treat yourself!</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.redemptions.map((r: Redemption) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  <Icon name={r.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{r.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">{timeAgo(r.redeemed_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !redeeming && setConfirming(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-sm rounded-2xl p-6 text-center"
            >
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                <Icon name={confirming.icon} size={26} />
              </span>
              <h3 className="text-lg font-bold text-white">Redeem {confirming.name}?</h3>
              <p className="mt-1 text-sm text-zinc-400">
                This will cost{" "}
                <span className="font-bold text-amber-300">{confirming.cost_coins.toLocaleString()} coins</span>. You
                have {coins.toLocaleString()}.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  onClick={() => redeem(confirming)}
                  disabled={redeeming}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110 disabled:opacity-60"
                >
                  {redeeming && <Loader2 size={14} className="animate-spin" />} Confirm
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  disabled={redeeming}
                  className="rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:border-white/30"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
