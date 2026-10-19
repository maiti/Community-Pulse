"use client";

import { useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Pencil, Play, SearchX, Sparkles, X } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { ALL_FILTER, CATEGORIES, CATEGORY_ORDER } from "@/lib/categories";
import { HOME_PROFILE_ID, useLocationState } from "@/lib/location-state";
import { buildFeed, describePrefs, hasCriteria } from "@/lib/match";
import type { CategoryId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityCard } from "./ActivityCard";
import { Landscape } from "./decor/Landscape";
import { Sunburst } from "./decor/Sunburst";
import { Button } from "./ui/button";

function PreferencePill() {
  const { prefs, prefsActive, setPrefsActive, openQuiz } = useAppState();

  if (!hasCriteria(prefs)) {
    return (
      <motion.button
        type="button"
        onClick={openQuiz}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-dashed border-teal/50 bg-white px-3.5 text-meta font-semibold text-teal"
      >
        <Sparkles className="size-4" />
        Personalize your feed
      </motion.button>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {prefsActive ? (
        <motion.div
          key="on"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="inline-flex h-9 max-w-full items-center gap-2 rounded-full border border-electric/15 bg-pastel-sky pl-3 pr-1 text-meta font-semibold text-navy"
        >
          <Sparkles className="size-4 shrink-0 text-forest" fill="#00594D" fillOpacity={0.15} />
          <span className="truncate">{describePrefs(prefs)}</span>
          <span className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={openQuiz}
              className="grid size-7 place-items-center rounded-full text-ink-muted transition hover:bg-white hover:text-electric"
              aria-label="Edit preferences"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPrefsActive(false)}
              className="grid size-7 place-items-center rounded-full text-ink-muted transition hover:bg-white hover:text-coral"
              aria-label="Pause preferences and show everything"
            >
              <X className="size-3.5" />
            </button>
          </span>
        </motion.div>
      ) : (
        <motion.button
          key="off"
          type="button"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => setPrefsActive(true)}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-dashed border-line bg-white px-3.5 text-meta font-semibold text-ink-muted hover:text-ink"
        >
          <Play className="size-3.5 text-forest" />
          Apply my picks
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function CategoryFilters() {
  const { category, setCategory, activities, query, appliedPrefs } = useAppState();

  const counts = useMemo(() => {
    const items = buildFeed(activities, { category: "all", query, prefs: appliedPrefs });
    const out: Record<string, number> = { all: items.length };
    for (const id of CATEGORY_ORDER) {
      out[id] = items.filter(({ activity }) => activity.category === id || activity.vibeCategories.includes(id)).length;
    }
    return out;
  }, [activities, query, appliedPrefs]);

  const filters: { id: CategoryId | "all"; label: string; icon: typeof ALL_FILTER.icon; color: string; pastel: string; onColor: string }[] = [
    { ...ALL_FILTER, onColor: "#FFFFFF" },
    ...CATEGORY_ORDER.map((id) => CATEGORIES[id]),
  ];

  return (
    <div role="toolbar" aria-label="Filter by category" className="scrollbar-none fade-x -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {filters.map(({ id, label, icon: Icon, color, pastel, onColor }) => {
        const active = category === id;
        const isAll = id === "all";
        return (
          <motion.button
            key={id}
            type="button"
            onClick={() => setCategory(id)}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            aria-pressed={active}
            className={cn(
              "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-meta font-semibold transition-colors",
              !active && (isAll ? "border border-line bg-white text-navy" : "text-navy"),
            )}
            style={!active && !isAll ? { background: pastel } : undefined}
          >
            {active && (
              <motion.span
                layoutId="category-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: color }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <Icon className="relative size-4" style={{ color: active ? onColor : color }} strokeWidth={2} />
            <span className="relative" style={active ? { color: onColor } : undefined}>
              {label}
            </span>
            <span
              className={cn(
                "relative rounded-full px-1.5 text-[10px] font-bold leading-4",
                active ? "bg-white/25" : "bg-white/80 text-ink-muted",
              )}
              style={active ? { color: onColor } : undefined}
            >
              {counts[id]}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function DiscoveryFeed() {
  const {
    feed,
    hoveredId,
    selectedId,
    saved,
    plans,
    appliedPrefs,
    query,
    category,
    setQuery,
    setCategory,
    setPrefsActive,
    setHoveredId,
    setSelectedId,
    toggleSaved,
    setPlanTarget,
  } = useAppState();
  const { profile } = useLocationState();
  const preferredMode = appliedPrefs?.modes[0] ?? "transit";
  const onSelect = useCallback((id: string) => setSelectedId(id), [setSelectedId]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 pt-5 lg:px-7 lg:pt-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-1 text-[22px] font-bold leading-tight tracking-[-0.02em] text-navy lg:text-[26px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={profile.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="truncate"
              >
                Discover {profile.kind === "detected" ? "Your Community" : profile.name}
              </motion.span>
            </AnimatePresence>
            <Sunburst className="-mt-3 size-10 shrink-0" />
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">Local places. Real people. A more connected community.</p>
        </div>
        <PreferencePill />
      </div>

      <div className="sticky top-0 z-10 mt-4 border-b border-transparent bg-canvas/90 px-4 py-2 backdrop-blur-md lg:px-7">
        <CategoryFilters />
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-2 text-meta text-ink-muted lg:px-7">
        <p aria-live="polite">
          <span className="font-bold text-ink">{feed.length}</span> {feed.length === 1 ? "place or event" : "places & events"} in{" "}
          {profile.code}
          <span className="text-ink-soft"> · {appliedPrefs ? "best match first" : "nearest first"}</span>
        </p>
        {profile.id !== HOME_PROFILE_ID && (
          <p className="hidden items-center gap-1 text-ink-soft sm:inline-flex" title="The bundled listings are a template, re-centered on this district. Replace data/activities.json with local listings.">
            <Info className="size-3.5" /> Sample listings
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-3 px-4 pb-8 lg:px-7">
        <AnimatePresence mode="popLayout" initial={true}>
          {feed.map(({ activity, match }, index) => (
            <motion.li
              key={activity.id}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 10) * 0.045, type: "spring", stiffness: 260, damping: 26 } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
            >
              <ActivityCard
                activity={activity}
                match={match}
                highlighted={hoveredId === activity.id}
                selected={selectedId === activity.id}
                saved={saved.includes(activity.id)}
                planned={!!plans[activity.id]}
                anchorLabel={profile.anchorLabel}
                preferredMode={preferredMode}
                onHover={setHoveredId}
                onSelect={onSelect}
                onToggleSave={toggleSaved}
                onPlan={setPlanTarget}
              />
            </motion.li>
          ))}
        </AnimatePresence>

        {feed.length === 0 && (
          <motion.li
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-18 border border-line bg-white px-6 pb-24 pt-8 text-center"
          >
            <SearchX className="mx-auto size-8 text-teal" strokeWidth={1.5} />
            <p className="mt-3 text-base font-bold text-ink">Nothing matches just yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-muted">
              Try a different word, widen your filters, or pause your quiz picks to see everything nearby.
            </p>
            <div className="relative z-10 mt-4 flex flex-wrap justify-center gap-2">
              {query && (
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              )}
              {category !== "all" && (
                <Button variant="outline" size="sm" onClick={() => setCategory("all")}>
                  All categories
                </Button>
              )}
              {appliedPrefs && (
                <Button variant="soft" size="sm" onClick={() => setPrefsActive(false)}>
                  Pause my picks
                </Button>
              )}
            </div>
            <Landscape className="absolute inset-x-0 bottom-0 h-24 w-full" />
          </motion.li>
        )}
      </ul>
    </div>
  );
}
