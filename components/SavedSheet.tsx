"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Heart, MapPin, Navigation } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { CATEGORIES } from "@/lib/categories";
import { directionsUrl } from "@/lib/geo";
import type { Activity } from "@/lib/types";
import { formatWhen } from "@/lib/utils";
import { ActivityThumb } from "./ActivityCard";
import { Landscape } from "./decor/Landscape";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet";

export function SavedItem({ activity, onOpen }: { activity: Activity; onOpen: () => void }) {
  const { toggleSaved, saved } = useAppState();
  const meta = CATEGORIES[activity.category];
  const when = formatWhen(activity.date);
  const isSaved = saved.includes(activity.id);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
      className="group/card flex gap-3 rounded-14 border border-line bg-white p-2.5 shadow-card"
    >
      <button type="button" onClick={onOpen} className="shrink-0" aria-label={`Show ${activity.title} on the map`}>
        <ActivityThumb activity={activity} sizes="72px" className="size-[72px] rounded-12" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-micro font-semibold" style={{ color: meta.color === "#F5A623" ? "#B97100" : meta.color }}>
          {meta.label}
        </p>
        <button type="button" onClick={onOpen} className="block max-w-full truncate text-left text-sm font-bold text-ink hover:text-teal">
          {activity.title}
        </button>
        <p className="truncate text-meta text-ink-muted">
          {when.day}
          {when.time && ` · ${when.time}`}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <a
            href={directionsUrl(activity)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-micro font-semibold text-ink hover:bg-canvas"
          >
            <Navigation className="size-3" /> Directions
          </a>
          <span className="inline-flex items-center gap-1 truncate text-micro text-ink-soft">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{activity.location.name}</span>
          </span>
        </div>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => toggleSaved(activity.id)}
        className="grid size-8 shrink-0 place-items-center self-start rounded-full text-coral hover:bg-coral/10"
        aria-label={isSaved ? `Remove ${activity.title} from saved` : `Save ${activity.title}`}
        aria-pressed={isSaved}
      >
        <Heart className="size-4" fill={isSaved ? "currentColor" : "none"} />
      </motion.button>
    </motion.li>
  );
}

export function SavedSheet() {
  const { savedOpen, setSavedOpen, saved, byId, setSelectedId, setView } = useAppState();
  const items = saved.map((id) => byId.get(id)).filter((a): a is Activity => !!a);

  return (
    <Sheet open={savedOpen} onOpenChange={setSavedOpen}>
      <SheetContent>
        <div className="relative overflow-hidden border-b border-line bg-white px-6 pb-5 pt-6">
          <div className="pointer-events-none absolute inset-0 bg-topo-navy bg-topo opacity-70" />
          <div className="relative flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-14 bg-coral/10 text-coral">
              <Bookmark className="size-5" />
            </span>
            <div>
              <SheetTitle>Saved Activities</SheetTitle>
              <SheetDescription>
                {items.length ? `${items.length} saved · stored on this device` : "Tap the heart on any card to save it here."}
              </SheetDescription>
            </div>
          </div>
        </div>

        <ul className="scrollbar-thin flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
          <AnimatePresence initial={true}>
            {items.map((activity) => (
              <SavedItem
                key={activity.id}
                activity={activity}
                onOpen={() => {
                  setSavedOpen(false);
                  setView("discover");
                  setSelectedId(activity.id);
                }}
              />
            ))}
          </AnimatePresence>
          {items.length === 0 && (
            <li className="relative mt-2 overflow-hidden rounded-18 border border-dashed border-line bg-white px-6 pb-24 pt-10 text-center">
              <Heart className="mx-auto size-8 text-coral/70" strokeWidth={1.5} />
              <p className="mt-3 font-bold text-ink">No saved activities yet</p>
              <p className="mt-1 text-[13px] text-ink-muted">Build a shortlist of places to try with friends.</p>
              <Landscape className="absolute inset-x-0 bottom-0 h-20 w-full" />
            </li>
          )}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
