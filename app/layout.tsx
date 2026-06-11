import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fun Friday — The Arena",
  description: "The employee gaming arena. Play, score, climb the leaderboard every Friday.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a14] text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
