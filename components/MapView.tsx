"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Landmark, Layers, Minus, Navigation2, Plus } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { useLocationState } from "@/lib/location-state";
import { cn } from "@/lib/utils";
import type { MapController } from "./map/controller";
import { FallbackMap } from "./map/FallbackMap";
import { MapboxCanvas } from "./map/MapboxCanvas";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function EdgeLabel({ text, side }: { text: string; side: "north" | "south" | "east" | "west" }) {
  const Icon = { north: ArrowUp, south: ArrowDown, east: ArrowRight, west: ArrowLeft }[side];
  const position = {
    north: "left-1/2 top-[72px] -translate-x-1/2",
    south: "bottom-4 left-1/2 -translate-x-1/2",
    east: "right-1 top-1/2 -translate-y-1/2 rotate-90 origin-center translate-x-[38%]",
    west: "left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center -translate-x-[38%]",
  }[side];
  return (
    <motion.span
      key={text}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "pointer-events-none absolute z-10 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/70 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy/60 backdrop-blur-sm",
        position,
      )}
    >
      {side === "west" || side === "north" ? <Icon className="size-3" /> : null}
      {text}
      {side === "east" || side === "south" ? <Icon className="size-3" /> : null}
    </motion.span>
  );
}

export function MapView({ className }: { className?: string }) {
  const { activities, feed, setLocationOpen } = useAppState();
  const { profile } = useLocationState();
  const [controller, setController] = useState<MapController | null>(null);
  const [bearing, setBearing] = useState(0);
  const [mapboxFailed, setMapboxFailed] = useState(false);
  const useMapbox = !!MAPBOX_TOKEN && !mapboxFailed;

  const visible = useMemo(() => feed.map((f) => f.activity), [feed]);
  const onController = useCallback((c: MapController | null) => setController(c), []);
  const onFail = useCallback(() => setMapboxFailed(true), []);

  return (
    <section aria-label="Activity map" className={cn("relative isolate h-full overflow-hidden bg-[#EDF3EF]", className)}>
      {useMapbox ? (
        <MapboxCanvas
          token={MAPBOX_TOKEN}
          allActivities={activities}
          activities={visible}
          onController={onController}
          onBearing={setBearing}
          onFail={onFail}
        />
      ) : (
        <FallbackMap
          key={profile.id}
          allActivities={activities}
          activities={visible}
          seedKey={profile.id}
          onController={onController}
        />
      )}

      {/* Edge cues toward nearby neighborhoods */}
      <AnimatePresence>
        <EdgeLabel key={`n-${profile.id}`} side="north" text={profile.edges.north} />
        <EdgeLabel key={`s-${profile.id}`} side="south" text={profile.edges.south} />
        <EdgeLabel key={`e-${profile.id}`} side="east" text={profile.edges.east} />
        <EdgeLabel key={`w-${profile.id}`} side="west" text={profile.edges.west} />
      </AnimatePresence>

      {/* Toolbar */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <motion.button
          type="button"
          onClick={() => controller?.recenter()}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="grid size-10 place-items-center rounded-full border border-line bg-white shadow-lift"
          aria-label="Reset north and recenter on the district"
          title="Recenter"
        >
          <motion.span animate={{ rotate: -bearing }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
            <Navigation2 className="size-[18px] fill-coral/90 text-coral" strokeWidth={1.5} />
          </motion.span>
        </motion.button>
        <motion.button
          type="button"
          onClick={() => setLocationOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-navy pl-3 pr-4 text-meta font-semibold text-white shadow-lift"
        >
          <Landmark className="size-4 text-[#7FE3E5]" />
          Change Region / District
        </motion.button>
      </div>

      <div className="absolute right-4 top-4 z-20 flex flex-col overflow-hidden rounded-14 border border-line bg-white shadow-lift">
        <button
          type="button"
          onClick={() => controller?.zoomBy(1.5)}
          className="grid size-10 place-items-center text-ink transition hover:bg-canvas"
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </button>
        <span className="h-px bg-line" />
        <button
          type="button"
          onClick={() => controller?.zoomBy(1 / 1.5)}
          className="grid size-10 place-items-center text-ink transition hover:bg-canvas"
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </button>
      </div>

      {!useMapbox && (
        <p
          className="absolute left-4 top-[68px] z-10 hidden items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-micro font-medium text-ink-muted backdrop-blur-sm sm:inline-flex"
          title="Set NEXT_PUBLIC_MAPBOX_TOKEN to load street tiles"
        >
          <Layers className="size-3.5 text-teal" />
          Illustrated map · {profile.code}
        </p>
      )}
    </section>
  );
}
