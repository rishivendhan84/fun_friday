"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  Coins,
  Gamepad2,
  Gift,
  LayoutDashboard,
  LogOut,
  Swords,
  Trophy,
  User as UserIcon,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useUser } from "@/components/UserProvider";
import Avatar from "@/components/Avatar";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/games", label: "Games", icon: Swords },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/achievements", label: "Achievements", icon: Award },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export default function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  async function logout() {
    try {
      await api<{ ok: boolean }>("/api/auth/logout", { method: "POST", noAuthRedirect: true });
    } catch {
      // ignore
    }
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/8 bg-black/30 backdrop-blur-xl md:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow shadow-violet-600/40">
            <Gamepad2 size={18} className="text-white" />
          </span>
          <span className="text-sm font-black leading-tight">
            Fun Friday
            <span className="block text-[11px] font-semibold text-violet-300">THE ARENA</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-violet-600/20 text-violet-200 shadow-inner"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} className={active ? "text-violet-300" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/8 p-4">
          {user && (
            <div className="mb-3 flex items-center gap-3">
              <Avatar name={user.name} color={user.avatarColor} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-semibold text-violet-300">Lv {user.level}</span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <Coins size={12} /> {user.coins.toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/8 bg-black/40 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
            <Gamepad2 size={16} className="text-white" />
          </span>
          <span className="text-sm font-black">The Arena</span>
        </Link>
        {user && (
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-full bg-violet-600/20 px-2.5 py-1 font-bold text-violet-300">Lv {user.level}</span>
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300">
              <Coins size={12} /> {user.coins.toLocaleString()}
            </span>
            <button onClick={logout} aria-label="Log out" className="p-1 text-zinc-400 hover:text-red-400">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/8 bg-black/60 px-1 py-1.5 backdrop-blur-xl md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium ${
                active ? "text-violet-300" : "text-zinc-500"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 px-4 pb-24 pt-16 md:ml-60 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
