"use client";

import { motion } from "framer-motion";
import { Compass, LifeBuoy, Map as MapIcon, Sparkles, Users, type LucideIcon } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import type { AppView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogoMark } from "./decor/Logo";
import { TopoLines } from "./decor/TopoLines";

export const NAV_ITEMS: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "activity", label: "My Activity", icon: Sparkles },
  { id: "community", label: "Community", icon: Users },
  { id: "resources", label: "Resources", icon: LifeBuoy },
];

const TOP_PEAKS = [
  { x: 20, y: -10, rings: 7, base: 10, step: 11, seed: 7 },
  { x: 100, y: 40, rings: 4, base: 8, step: 12, seed: 19 },
];
const BOTTOM_PEAKS = [
  { x: 80, y: 190, rings: 8, base: 10, step: 12, seed: 31 },
  { x: -10, y: 120, rings: 4, base: 9, step: 11, seed: 43 },
];

export function Sidebar() {
  const { view, setView } = useAppState();

  return (
    <aside className="relative z-30 hidden h-full w-[102px] shrink-0 flex-col items-center overflow-hidden bg-navy lg:flex">
      <TopoLines width={102} height={170} peaks={TOP_PEAKS} className="absolute inset-x-0 top-0 h-[170px] w-full" />
      <TopoLines width={102} height={210} peaks={BOTTOM_PEAKS} strokeOpacity={0.3} className="absolute inset-x-0 bottom-0 h-[210px] w-full" />

      <motion.div
        className="relative mt-5"
        whileHover={{ scale: 1.06, rotate: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <LogoMark />
        <span className="sr-only">CommunityPulse</span>
      </motion.div>

      <nav aria-label="Primary" className="relative mt-9 flex w-full flex-col gap-1.5 px-2.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-[64px] w-full flex-col items-center justify-center gap-1.5 rounded-14 text-meta font-medium transition-colors",
                active ? "text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-14 border-l-[3px] border-teal bg-electric/20"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon
                className={cn("relative size-[22px] transition-transform group-hover:scale-110", active && "text-[#7FE3E5]")}
                strokeWidth={1.75}
              />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </nav>

      <p className="relative mb-6 mt-auto px-3 text-center text-micro font-medium leading-[15px] text-white/70">
        <span className="font-bold text-amber">Stronger</span> Communities,
        <br />
        <span className="font-bold text-amber">Brighter</span> Tomorrows
      </p>
    </aside>
  );
}

/** Bottom tab bar standing in for the rail on small screens. */
export function MobileNav() {
  const { view, setView } = useAppState();
  return (
    <nav
      aria-label="Primary"
      className="relative z-30 flex h-16 shrink-0 items-stretch justify-around border-t border-white/10 bg-navy px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium",
              active ? "text-white" : "text-white/55",
            )}
          >
            {active && (
              <motion.span layoutId="mobile-nav-active" className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-teal" />
            )}
            <Icon className={cn("size-5", active && "text-[#7FE3E5]")} strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
