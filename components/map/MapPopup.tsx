"use client";

import { motion } from "framer-motion";
import { Bus, Car, Check, Clock3, Footprints, Heart, Navigation, X } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { CATEGORIES } from "@/lib/categories";
import { directionsUrl } from "@/lib/geo";
import { SOURCE_ATTRIBUTION } from "@/lib/sources";
import type { Activity } from "@/lib/types";
import { cn, formatWhen } from "@/lib/utils";
import { ActivityThumb, CategoryBadge } from "../ActivityCard";

type Props = {
  activity: Activity;
  /** Pin tip position within the map pane. */
  x: number;
  y: number;
  paneWidth: number;
  paneHeight: number;
};

const POPUP_WIDTH = 350;

/** Floating detail card that tracks the selected pin. */
export function MapPopup({ activity, x, y, paneWidth, paneHeight }: Props) {
  const { saved, toggleSaved, plans, setPlanTarget, setSelectedId, appliedPrefs } = useAppState();
  const meta = CATEGORIES[activity.category];
  const when = formatWhen(activity.date);
  const width = Math.min(POPUP_WIDTH, paneWidth - 24);
  const left = Math.min(Math.max(x - width / 2, 12), paneWidth - width - 12);
  const above = y > paneHeight * 0.52;
  const isSaved = saved.includes(activity.id);
  const planned = !!plans[activity.id];
  const transit = activity.transitInfo;

  return (
    <motion.div
      role="dialog"
      aria-label={activity.title}
      className="pointer-events-auto absolute z-[5000] overflow-hidden rounded-18 border border-line bg-white shadow-float"
      style={{
        left,
        width,
        ...(above ? { bottom: paneHeight - y + 62 } : { top: y + 14 }),
        transformOrigin: `${x - left}px ${above ? "100%" : "0%"}`,
      }}
      initial={{ opacity: 0, scale: 0.9, y: above ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative h-[118px]">
        <ActivityThumb activity={activity} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/75 via-navy/10 to-transparent" />
        <CategoryBadge activity={activity} className="absolute left-3 top-3 shadow-card" />
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-white/90 text-ink shadow-card transition hover:bg-white"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
        <p className="absolute inset-x-3 bottom-2.5 line-clamp-2 text-[15px] font-bold leading-5 text-white">{activity.title}</p>
      </div>

      <div className="space-y-2.5 p-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-muted">
          <span className="truncate">
            {activity.organization}
            <span className="text-ink-soft"> · {SOURCE_ATTRIBUTION[activity.source]}</span>
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-ink">
            <Clock3 className="size-3.5 text-teal" />
            {when.day}
            {when.time && ` · ${when.time}`}
          </span>
        </div>
        <p className="line-clamp-2 text-meta leading-[17px] text-ink-muted">{activity.description}</p>

        <div className="flex items-center gap-3 rounded-12 bg-canvas px-3 py-2 text-meta font-semibold text-ink">
          <span className="inline-flex items-center gap-1">
            <Car className="size-3.5 text-ink-muted" /> {activity.driveTimeMinutes}m
          </span>
          <span className={cn("inline-flex items-center gap-1", transit.hasPublicTransit ? "text-electric" : "text-ink-soft")}>
            <Bus className="size-3.5" /> {transit.hasPublicTransit ? `${transit.estimatedTransitMinutes}m` : "—"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Footprints className="size-3.5 text-ink-muted" /> {activity.walkTimeMinutes}m
          </span>
          <span className="ml-auto truncate text-micro font-medium text-ink-soft">{activity.location.name}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleSaved(activity.id)}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Remove from saved" : "Save"}
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-12 border transition-colors",
              isSaved ? "border-coral/30 bg-coral/10 text-coral" : "border-line text-ink-muted hover:text-coral",
            )}
          >
            <Heart className="size-4" fill={isSaved ? "currentColor" : "none"} />
          </button>
          <a
            href={directionsUrl(activity, appliedPrefs?.modes[0] ?? "transit")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-12 border border-line bg-white text-meta font-semibold text-ink transition hover:bg-canvas"
          >
            <Navigation className="size-3.5" /> Directions
          </a>
          <button
            type="button"
            onClick={() => setPlanTarget(activity)}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-12 text-meta font-bold transition hover:brightness-95"
            style={{ background: meta.color, color: meta.onColor }}
          >
            {planned && <Check className="size-3.5" />}
            {activity.type === "event" ? (planned ? "Going" : "RSVP") : planned ? "Planned" : "Visit"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
