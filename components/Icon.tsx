"use client";

import type { LucideIcon, LucideProps } from "lucide-react";
import {
  AlarmClock,
  Award,
  Brain,
  Clapperboard,
  Coffee,
  Crown,
  Flame,
  Gamepad2,
  Gift,
  Keyboard,
  Layers,
  Plane,
  Search,
  Shield,
  Sparkles,
  Star,
  Sunrise,
  Swords,
  TrendingUp,
  Utensils,
  Wand2,
  Zap,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  layers: Layers,
  zap: Zap,
  keyboard: Keyboard,
  search: Search,
  crown: Crown,
  swords: Swords,
  flame: Flame,
  shield: Shield,
  "trending-up": TrendingUp,
  "wand-2": Wand2,
  brain: Brain,
  star: Star,
  sparkles: Sparkles,
  "alarm-clock": AlarmClock,
  coffee: Coffee,
  sunrise: Sunrise,
  utensils: Utensils,
  clapperboard: Clapperboard,
  plane: Plane,
  gift: Gift,
  "gamepad-2": Gamepad2,
  award: Award,
};

interface IconProps extends LucideProps {
  name: string;
}

export default function Icon({ name, ...props }: IconProps) {
  const Cmp = ICONS[name] ?? Sparkles;
  return <Cmp {...props} />;
}
