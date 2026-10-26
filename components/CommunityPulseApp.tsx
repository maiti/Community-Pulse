"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { AppStateProvider, useAppState } from "@/lib/app-state";
import { LocationProvider } from "@/lib/location-state";
import { createPersistentStore, usePersistentStore } from "@/lib/persistent-store";
import { cn } from "@/lib/utils";
import { DiscoveryFeed } from "./DiscoveryFeed";
import { Header } from "./Header";
import { LocationDialog } from "./LocationDialog";
import { MapView } from "./MapView";
import { PlanDialog } from "./PlanDialog";
import { QuizModal } from "./QuizModal";
import { SavedSheet } from "./SavedSheet";
import { MobileNav, Sidebar } from "./Sidebar";
import { CommunityView } from "./views/CommunityView";
import { MyActivityView } from "./views/MyActivityView";
import { ResourcesView } from "./views/ResourcesView";

function LeftPane() {
  const { view } = useAppState();
  const paneKey = view === "map" ? "discover" : view;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={paneKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="scrollbar-thin h-full overflow-y-auto overscroll-contain"
      >
        {paneKey === "discover" && <DiscoveryFeed />}
        {paneKey === "activity" && <MyActivityView />}
        {paneKey === "community" && <CommunityView />}
        {paneKey === "resources" && <ResourcesView />}
      </motion.div>
    </AnimatePresence>
  );
}

/** Feed width as a percentage of the desktop split view; the map takes the rest. */
const DEFAULT_SPLIT = 55;
const MIN_SPLIT = 32;
const MAX_SPLIT = 75;
const splitStore = createPersistentStore<number>("cp:split", DEFAULT_SPLIT);
const clampSplit = (n: number) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, Math.round(n * 10) / 10));

/** Drag handle between the feed and the map (desktop only). Arrow keys nudge it; double-click resets it. */
function SplitHandle({
  split,
  onDrag,
  onCommit,
  containerRef,
}: {
  split: number;
  onDrag: (split: number | null) => void;
  onCommit: (split: number) => void;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const toSplit = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? clampSplit(((clientX - rect.left) / rect.width) * 100) : split;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const next = { ArrowLeft: split - step, ArrowRight: split + step, Home: MIN_SPLIT, End: MAX_SPLIT }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onCommit(clampSplit(next));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the list and map"
      aria-valuenow={Math.round(split)}
      aria-valuemin={MIN_SPLIT}
      aria-valuemax={MAX_SPLIT}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onDrag(toSplit(e.clientX));
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onDrag(toSplit(e.clientX));
      }}
      onPointerUp={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        onCommit(toSplit(e.clientX));
        onDrag(null);
      }}
      onPointerCancel={() => onDrag(null)}
      onDoubleClick={() => onCommit(DEFAULT_SPLIT)}
      onKeyDown={onKeyDown}
      style={{ left: `${split}%` }}
      className="group/split absolute inset-y-0 z-30 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none justify-center outline-none lg:flex"
    >
      <span className="h-full w-px bg-line transition-colors group-hover/split:bg-teal/60 group-focus-visible/split:bg-teal" />
      <span className="absolute top-1/2 grid h-10 w-4 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink-soft shadow-card transition-colors group-hover/split:border-teal/50 group-hover/split:text-teal group-focus-visible/split:border-teal group-focus-visible/split:text-teal">
        <GripVertical className="size-3.5" />
      </span>
    </div>
  );
}

function Shell() {
  const { view } = useAppState();
  const mapOnly = view === "map";
  const mainRef = useRef<HTMLElement>(null);
  const [savedSplit, setSavedSplit] = usePersistentStore(splitStore);
  // While dragging, track the split locally and only save it on release.
  const [dragSplit, setDragSplit] = useState<number | null>(null);
  const split = clampSplit(dragSplit ?? savedSplit);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main ref={mainRef} className="relative flex min-h-0 flex-1" style={{ "--split": `${split}%` } as CSSProperties}>
          <div
            className={cn(
              "min-w-0 bg-canvas transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:shrink-0",
              mapOnly ? "hidden lg:block lg:w-0 lg:overflow-hidden" : "w-full lg:w-[var(--split)]",
              dragSplit !== null && "transition-none",
            )}
          >
            <LeftPane />
          </div>
          <div className={cn("relative min-w-0 flex-1 lg:block", mapOnly ? "block" : "hidden")}>
            <MapView className="absolute inset-0" />
          </div>
          {!mapOnly && <SplitHandle split={split} onDrag={setDragSplit} onCommit={setSavedSplit} containerRef={mainRef} />}
        </main>
        <MobileNav />
      </div>

      <QuizModal />
      <SavedSheet />
      <PlanDialog />
      <LocationDialog />
    </div>
  );
}

export default function CommunityPulseApp() {
  return (
    <MotionConfig reducedMotion="user">
      <LocationProvider>
        <AppStateProvider>
          <Shell />
        </AppStateProvider>
      </LocationProvider>
    </MotionConfig>
  );
}
