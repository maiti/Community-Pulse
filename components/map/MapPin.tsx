"use client";

import { motion } from "framer-motion";
import { CATEGORIES } from "@/lib/categories";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";

const TEARDROP =
  "M17 1C8.2 1 1 8 1 16.7c0 10.6 13.3 24.2 14.6 25.5a2 2 0 0 0 2.8 0C19.7 40.9 33 27.3 33 16.7 33 8 25.8 1 17 1z";

type PinProps = {
  activity: Activity;
  x: number;
  y: number;
  emphasized: boolean;
  dimmed: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

/** Category-colored teardrop pin; anchored at its tip. */
export function MapPin({ activity, x, y, emphasized, dimmed, onHover, onSelect }: PinProps) {
  const meta = CATEGORIES[activity.category];
  const Icon = meta.icon;
  return (
    <motion.button
      type="button"
      className="pointer-events-auto absolute left-0 top-0 origin-bottom"
      style={{ x: x - 17, y: y - 44, zIndex: emphasized ? 4000 : 10 + Math.max(0, Math.round(y)) }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: emphasized ? 1.28 : 1, opacity: dimmed ? 0.55 : 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: emphasized ? 1.28 : 1.12 }}
      transition={{ type: "spring", stiffness: 420, damping: 20 }}
      onMouseEnter={() => onHover(activity.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(activity.id)}
      onBlur={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(activity.id);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={`${activity.title} — ${meta.label}`}
    >
      {emphasized && (
        <span aria-hidden="true" className="absolute left-1/2 top-[44px]">
          <span className="absolute left-0 top-0 size-14 animate-halo-pulse rounded-full bg-teal/40" />
          <span className="absolute left-0 top-0 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal/70 bg-teal/15" />
        </span>
      )}
      <svg width="34" height="44" viewBox="0 0 34 44" className="relative drop-shadow-[0_6px_6px_rgba(6,29,53,0.28)]">
        <path d={TEARDROP} fill={meta.color} stroke={emphasized ? "#009C9F" : "#FFFFFF"} strokeWidth={emphasized ? 2.5 : 2} />
        <circle cx="17" cy="16.5" r="10.5" fill="#FFFFFF" fillOpacity={0.18} />
      </svg>
      <Icon className="absolute left-[9px] top-[8.5px] size-4" style={{ color: meta.onColor }} strokeWidth={2.4} />
    </motion.button>
  );
}

type ClusterProps = {
  count: number;
  x: number;
  y: number;
  colors: string[];
  onClick: () => void;
};

export function ClusterBubble({ count, x, y, colors, onClick }: ClusterProps) {
  // A conic ring shows the category mix inside the cluster.
  const step = 100 / colors.length;
  const ring = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(", ");
  return (
    <motion.button
      type="button"
      className={cn("pointer-events-auto absolute left-0 top-0 grid size-11 place-items-center rounded-full p-[3px] shadow-lift")}
      style={{ x: x - 22, y: y - 22, background: `conic-gradient(${ring})`, zIndex: 3000 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={`${count} activities here — zoom in`}
    >
      <span className="grid size-full place-items-center rounded-full bg-navy text-meta font-bold text-white">{count}</span>
    </motion.button>
  );
}
