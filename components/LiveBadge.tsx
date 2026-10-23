"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CalendarDays, Check, ChevronDown, LoaderCircle, MapPin, Minus, Ticket, Trees, type LucideIcon } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { useLocationState } from "@/lib/location-state";
import type { LiveSourceId, SourceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCE_ICONS: Record<LiveSourceId, LucideIcon> = {
  eventbrite: CalendarDays,
  ticketmaster: Ticket,
  google: MapPin,
  osm: Trees,
};

function SourceRow({ source }: { source: SourceStatus }) {
  const Icon = SOURCE_ICONS[source.id];
  const state = {
    ok: { icon: Check, text: `${source.count} ${source.count === 1 ? "listing" : "listings"}`, tone: "text-forest" },
    empty: { icon: Minus, text: "Nothing nearby", tone: "text-ink-soft" },
    skipped: { icon: Minus, text: "Not set up", tone: "text-ink-soft" },
    error: { icon: AlertTriangle, text: "Unavailable", tone: "text-[#b3263a]" },
  }[source.state];
  return (
    <li className="flex gap-2.5 py-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-canvas text-ink-muted">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-meta font-semibold text-ink">{source.label}</span>
          <span className={cn("inline-flex items-center gap-1 text-micro font-semibold", state.tone)}>
            <state.icon className="size-3" />
            {state.text}
          </span>
        </span>
        {source.note && <span className="mt-0.5 block text-micro leading-4 text-ink-muted">{source.note}</span>}
      </span>
    </li>
  );
}

/** "Live Feed for Chicago": shows whether listings are live, and from where. */
export function LiveBadge() {
  const { feedStatus, feedMeta } = useAppState();
  const { profile } = useLocationState();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const place = profile.kind === "detected" ? (feedMeta?.areaLabel ?? "Your Neighborhood") : profile.name;
  const loading = feedStatus === "loading";
  const live = !loading && feedStatus !== "offline" && (feedMeta?.liveCount ?? 0) > 0;
  const label = loading ? "Connecting to live sources…" : live ? `Live Feed for ${place}` : `Sample Feed for ${place}`;
  const sampleCount = feedMeta?.usedFallback ? (feedMeta.activities.length - feedMeta.liveCount) : 0;
  const updated = feedMeta && new Date(feedMeta.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className="relative inline-flex"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        whileHover={loading ? undefined : { scale: 1.02 }}
        whileTap={loading ? undefined : { scale: 0.98 }}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "inline-flex h-7 items-center gap-2 rounded-full border pl-2 pr-2.5 text-micro font-bold uppercase tracking-[0.08em] transition-colors",
          live ? "border-teal/30 bg-teal/10 text-forest" : "border-line bg-white text-ink-muted",
          loading && "cursor-progress",
        )}
      >
        {loading || feedStatus === "refreshing" ? (
          <LoaderCircle className="size-3.5 animate-spin text-teal" />
        ) : (
          <span className="relative grid size-3.5 place-items-center" aria-hidden="true">
            {live && <span className="absolute inset-0 rounded-full bg-teal/40 motion-safe:animate-ping" />}
            <span className={cn("relative size-2 rounded-full", live ? "bg-teal" : "bg-amber")} />
          </span>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="truncate"
          >
            {label}
          </motion.span>
        </AnimatePresence>
        {!loading && <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />}
      </motion.button>

      <AnimatePresence>
        {open && feedMeta && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute left-0 top-9 z-30 w-[300px] origin-top-left rounded-14 border border-line bg-white p-3 shadow-float"
          >
            <p className="text-meta font-bold text-ink">Where these listings come from</p>
            {feedStatus === "offline" ? (
              <p className="mt-1 text-micro leading-4 text-ink-muted">
                The live feed couldn&apos;t be reached, so you&apos;re seeing sample listings. They&apos;ll refresh when you&apos;re back online.
              </p>
            ) : (
              <ul className="mt-1 divide-y divide-line">
                {feedMeta.sources.map((s) => (
                  <SourceRow key={s.id} source={s} />
                ))}
              </ul>
            )}
            {sampleCount > 0 && feedStatus !== "offline" && (
              <p className="mt-2 rounded-12 bg-pastel-butter px-2.5 py-2 text-micro leading-4 text-[#7a4b00]">
                {feedMeta.liveCount
                  ? `Plus ${sampleCount} sample listings to round out a thin feed.`
                  : `Showing ${sampleCount} sample listings, re-centered on ${place}.`}
              </p>
            )}
            {updated && <p className="mt-2 text-micro text-ink-soft">Updated {updated} · travel times are estimates</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
