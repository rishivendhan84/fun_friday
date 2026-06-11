"use client";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  className?: string;
}

export default function Avatar({ name, color, size = 40, className }: AvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.38,
        boxShadow: `0 0 ${size / 3}px ${color}55`,
      }}
    >
      {initials(name)}
    </div>
  );
}
