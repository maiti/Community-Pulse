"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, type AnimationPlaybackControls } from "framer-motion";
import { useAppState } from "@/lib/app-state";
import { boundsOf, centroidOf, offsetKm } from "@/lib/geo";
import { contourRings, meander } from "@/lib/topo";
import type { Activity, Coordinates } from "@/lib/types";
import { useElementSize } from "@/lib/use-element-size";
import { hashString, mulberry32 } from "@/lib/utils";
import type { MapController } from "./controller";
import { PinLayer } from "./PinLayer";

type View = { cx: number; cy: number; zoom: number };

const PAD_X = 64;
const PAD_Y = 84;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 5;

/** World space: the frame occupies roughly the middle 400 units of a 1000-unit square. */
function buildWorld(points: Coordinates[]) {
  const b = boundsOf(points);
  const center = { lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 };
  const span = offsetKm({ lat: b.south, lng: b.west }, { lat: b.north, lng: b.east });
  const unitsPerKm = 400 / Math.max(span.east, span.north, 0.5);
  const toWorld = (c: Coordinates) => {
    const o = offsetKm(center, c);
    return { x: 500 + o.east * unitsPerKm, y: 500 - o.north * unitsPerKm };
  };
  const extent = { w: Math.max(span.east * unitsPerKm, 80), h: Math.max(span.north * unitsPerKm, 80) };
  return { toWorld, extent, unitsPerKm };
}

type World = ReturnType<typeof buildWorld>;

function buildDecor(seedKey: string, world: World) {
  const rand = mulberry32(hashString(seedKey));
  const angle = (rand() - 0.5) * 28;

  // Street grid: two families of parallel lines, a few randomly dropped.
  const grid: string[] = [];
  for (let i = -42; i <= 42; i++) {
    if (rand() < 0.14) continue;
    const x = 500 + i * 34;
    grid.push(`M${x} -1100V2100`);
  }
  for (let i = -42; i <= 42; i++) {
    if (rand() < 0.14) continue;
    const y = 500 + i * 34;
    grid.push(`M-1100 ${y}H2100`);
  }

  const arterials = [
    meander([-1100, 260 + rand() * 120], [2100, 300 + rand() * 160], Math.floor(rand() * 1e9), 70, 9),
    meander([-1100, 640 + rand() * 120], [2100, 700 + rand() * 120], Math.floor(rand() * 1e9), 60, 9),
    meander([300 + rand() * 120, -1100], [260 + rand() * 160, 2100], Math.floor(rand() * 1e9), 70, 9),
    meander([640 + rand() * 120, -1100], [700 + rand() * 120, 2100], Math.floor(rand() * 1e9), 60, 9),
  ];
  const highway = meander([-1100, -200 + rand() * 300], [2100, 1300 + rand() * 300], Math.floor(rand() * 1e9), 120, 8);

  const shore = meander([1060 + rand() * 90, -1100], [1020 + rand() * 90, 2100], Math.floor(rand() * 1e9), 110, 10);
  const water = `${shore}L2600 2100L2600 -1100Z`;
  const waterRotation = [0, 90, 180, 270][Math.floor(rand() * 4)];
  const river = meander([-1100, 180 + rand() * 640], [1150, 220 + rand() * 560], Math.floor(rand() * 1e9), 140, 12);

  const parks = Array.from({ length: 7 }, () =>
    contourRings({
      x: 120 + rand() * 760,
      y: 120 + rand() * 760,
      rings: 1,
      base: 22 + rand() * 34,
      step: 0,
      seed: Math.floor(rand() * 1e9),
      stretch: 0.8 + rand() * 0.7,
    })[0],
  );

  const topo = Array.from({ length: 4 }, () =>
    contourRings({
      x: rand() * 1000,
      y: rand() * 1000,
      rings: 8,
      base: 18,
      step: 30 + rand() * 12,
      seed: Math.floor(rand() * 1e9),
    }),
  ).flat();

  const ry = world.extent.h / 2 + 70;
  const district = contourRings({
    x: 500,
    y: 500,
    rings: 1,
    base: ry * 1.12,
    step: 0,
    seed: Math.floor(rand() * 1e9),
    stretch: (world.extent.w / 2 + 70) / ry,
  })[0];

  return { angle, grid: grid.join(""), arterials, highway, water, waterRotation, river, parks, topo, district };
}

type Props = {
  /** Points the default view should fit: every listing in the district. */
  frame: Coordinates[];
  activities: Activity[];
  seedKey: string;
  onController: (c: MapController | null) => void;
};

export function FallbackMap({ frame, activities, seedKey, onController }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref);
  const { selectedId, setSelectedId, byId } = useAppState();

  const world = useMemo(() => buildWorld(frame), [frame]);
  const decor = useMemo(() => buildDecor(seedKey, world), [seedKey, world]);

  const [view, setView] = useState<View>({ cx: 500, cy: 500, zoom: 1 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const baseScale =
    width && height ? Math.min((width - PAD_X * 2) / world.extent.w, (height - PAD_Y * 2) / world.extent.h) : 1;
  const scale = Math.max(baseScale, 0.05) * view.zoom;

  const project = useCallback(
    (c: Coordinates) => {
      const w = world.toWorld(c);
      return { x: width / 2 + (w.x - view.cx) * scale, y: height / 2 + (w.y - view.cy) * scale };
    },
    [world, width, height, view.cx, view.cy, scale],
  );

  const flight = useRef<AnimationPlaybackControls | null>(null);
  const flyTo = useCallback((target: View) => {
    flight.current?.stop();
    const from = viewRef.current;
    flight.current = animate(0, 1, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (t) =>
        setView({
          cx: from.cx + (target.cx - from.cx) * t,
          cy: from.cy + (target.cy - from.cy) * t,
          // Interpolate zoom geometrically so it feels linear.
          zoom: from.zoom * Math.pow(target.zoom / from.zoom, t),
        }),
    });
  }, []);

  const fitActivities = useCallback(
    (list: Activity[]) => {
      if (!list.length || !baseScale) return;
      const pts = list.map((a) => world.toWorld(a.location.coordinates));
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      const fit = Math.min(
        (width - PAD_X * 2) / Math.max(w, 1) / baseScale,
        (height - PAD_Y * 2) / Math.max(h, 1) / baseScale,
      );
      const c = centroidOf(pts.map((p) => ({ lat: p.y, lng: p.x })));
      flyTo({ cx: c.lng, cy: c.lat, zoom: Math.min(Math.max(fit, viewRef.current.zoom * 1.5), MAX_ZOOM) });
    },
    [world, width, height, baseScale, flyTo],
  );

  // Pan to the selected activity, leaving room above it for the popup.
  useEffect(() => {
    if (!selectedId || !baseScale) return;
    const activity = byId.get(selectedId);
    if (!activity) return;
    const w = world.toWorld(activity.location.coordinates);
    const zoom = Math.max(viewRef.current.zoom, 1.35);
    flyTo({ cx: w.x, cy: w.y - (height * 0.16) / (baseScale * zoom), zoom });
  }, [selectedId, byId, world, baseScale, height, flyTo]);

  useEffect(() => {
    onController({
      zoomBy: (f) => {
        const v = viewRef.current;
        flyTo({ ...v, zoom: Math.min(Math.max(v.zoom * f, MIN_ZOOM), MAX_ZOOM) });
      },
      recenter: () => flyTo({ cx: 500, cy: 500, zoom: 1 }),
      fitActivities,
    });
    return () => onController(null);
  }, [onController, flyTo, fitActivities]);

  // Wheel zoom around the cursor (non-passive so the page doesn't scroll).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      flight.current?.stop();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      setView((v) => {
        const s = Math.max(baseScale, 0.05);
        const zoom = Math.min(Math.max(v.zoom * Math.exp(-e.deltaY * 0.0015), MIN_ZOOM), MAX_ZOOM);
        const wx = v.cx + mx / (s * v.zoom);
        const wy = v.cy + my / (s * v.zoom);
        return { zoom, cx: wx - mx / (s * zoom), cy: wy - my / (s * zoom) };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [baseScale]);

  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);

  return (
    <div
      ref={ref}
      className="absolute inset-0 cursor-grab touch-none select-none overflow-hidden bg-[#EDF3EF] active:cursor-grabbing"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        flight.current?.stop();
        drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.hypot(dx, dy) > 3) d.moved = true;
        setView((v) => ({ ...v, cx: d.cx - dx / scale, cy: d.cy - dy / scale }));
      }}
      onPointerUp={() => {
        if (drag.current && !drag.current.moved) setSelectedId(null);
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      {width > 0 && (
        <svg width={width} height={height} className="absolute inset-0" aria-hidden="true">
          <g transform={`translate(${width / 2 - view.cx * scale} ${height / 2 - view.cy * scale}) scale(${scale})`}>
            <rect x={-1100} y={-1100} width={3200} height={3200} fill="#EDF3EF" />
            <g fill="#D4EEDD">
              {decor.parks.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <path d={decor.river} fill="none" stroke="#BFE0EA" strokeWidth={16} strokeLinecap="round" />
            <path d={decor.river} fill="none" stroke="#D3EBF1" strokeWidth={7} strokeLinecap="round" />
            <g fill="none" stroke="#009C9F" strokeOpacity={0.16} strokeWidth={1} vectorEffect="non-scaling-stroke">
              {decor.topo.map((d, i) => (
                <path key={i} d={d} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
            <g transform={`rotate(${decor.angle} 500 500)`}>
              <path d={decor.grid} stroke="#FFFFFF" strokeWidth={1.3} vectorEffect="non-scaling-stroke" opacity={0.95} />
              {decor.arterials.map((d, i) => (
                <g key={i}>
                  <path d={d} fill="none" stroke="#D7E0E9" strokeWidth={6.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                  <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={4.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                </g>
              ))}
              <path d={decor.highway} fill="none" stroke="#EBCB8B" strokeWidth={8} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
              <path d={decor.highway} fill="none" stroke="#FCE7B8" strokeWidth={5.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
            </g>
            <g transform={`rotate(${decor.waterRotation} 500 500)`}>
              <path d={decor.water} fill="#C9E6EE" />
              <path d={decor.water} fill="none" stroke="#A9D6E2" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            </g>
            <path d={decor.district} fill="#FFFFFF" fillOpacity={0.32} />
            <path
              d={decor.district}
              fill="none"
              stroke="#009C9F"
              strokeWidth={2}
              strokeDasharray="7 6"
              vectorEffect="non-scaling-stroke"
              strokeOpacity={0.75}
            />
          </g>
        </svg>
      )}
      {width > 0 && (
        <PinLayer
          activities={activities}
          project={project}
          width={width}
          height={height}
          onZoomToCluster={fitActivities}
        />
      )}
    </div>
  );
}
