import {
  BookOpen,
  Gamepad2,
  HandHeart,
  LayoutGrid,
  Palette,
  Trees,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId, TimeBudget, TravelMode } from "./types";

export type CategoryMeta = {
  id: CategoryId;
  label: string;
  /** Friendly name used by the vibe quiz and preference pill. */
  vibe: string;
  icon: LucideIcon;
  /** Accent from the brand palette. */
  color: string;
  /** Pastel fill for chips and filter pills. */
  pastel: string;
  /** Text color that reads on top of `color`. */
  onColor: string;
};

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  outdoors: { id: "outdoors", label: "Outdoors", vibe: "Outdoorsy", icon: Trees, color: "#00594D", pastel: "#E3F5EE", onColor: "#FFFFFF" },
  volunteer: { id: "volunteer", label: "Volunteer", vibe: "Giving Back", icon: HandHeart, color: "#F5A623", pastel: "#FFEBDD", onColor: "#061D35" },
  study: { id: "study", label: "Quiet Study", vibe: "Focused", icon: BookOpen, color: "#2379EE", pastel: "#E8F1FE", onColor: "#FFFFFF" },
  social: { id: "social", label: "Social", vibe: "Social", icon: Users, color: "#009C9F", pastel: "#FFE7EB", onColor: "#FFFFFF" },
  games: { id: "games", label: "Games", vibe: "Playful", icon: Gamepad2, color: "#7952E8", pastel: "#EFEAFD", onColor: "#FFFFFF" },
  arts: { id: "arts", label: "Arts", vibe: "Creative", icon: Palette, color: "#FF5365", pastel: "#FFF3D9", onColor: "#FFFFFF" },
};

export const CATEGORY_ORDER: CategoryId[] = ["outdoors", "volunteer", "study", "social", "games", "arts"];

export const ALL_FILTER = { id: "all" as const, label: "All", icon: LayoutGrid, color: "#061D35", pastel: "#061D35" };

export const TRAVEL_MODES: Record<TravelMode, { label: string; short: string }> = {
  walk: { label: "Walking", short: "Walk" },
  bike: { label: "Biking", short: "Bike" },
  transit: { label: "Public transit", short: "Transit" },
  ride: { label: "Getting a ride", short: "Ride" },
};

export const TIME_BUDGETS: Record<TimeBudget, { label: string; hint: string; range: [number, number] }> = {
  quick: { label: "Under 1 hr", hint: "A quick reset", range: [0, 60] },
  medium: { label: "1–3 hrs", hint: "An afternoon", range: [60, 180] },
  long: { label: "3+ hrs", hint: "Make a day of it", range: [180, 24 * 60] },
};
