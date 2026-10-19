"use client";

import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useAppState } from "@/lib/app-state";
import { CATEGORIES } from "@/lib/categories";
import type { Activity, Coordinates } from "@/lib/types";
import { ClusterBubble, MapPin } from "./MapPin";
import { MapPopup } from "./MapPopup";

export type Projector = (c: Coordinates) => { x: number; y: number };

type Props = {
  activities: Activity[];
  project: Projector;
  width: number;
  height: number;
  /** Zoom toward a group of pins that were drawn as one cluster. */
  onZoomToCluster: (members: Activity[]) => void;
};

const CLUSTER_RADIUS = 38;

type Placed = { activity: Activity; x: number; y: number };
type Group = { x: number; y: number; members: Placed[] };

/**
 * Screen-space clustering shared by the Mapbox and illustrated maps. The
 * hovered and selected pins always stay individual so feed sync never hides them.
 */
export function PinLayer({ activities, project, width, height, onZoomToCluster }: Props) {
  const { hoveredId, selectedId, setHoveredId, setSelectedId, byId } = useAppState();

  const placed: Placed[] = activities.map((activity) => ({ activity, ...project(activity.location.coordinates) }));

  const groups: Group[] = [];
  for (const p of placed) {
    const pinned = p.activity.id === selectedId || p.activity.id === hoveredId;
    const target = pinned
      ? undefined
      : groups.find(
          (g) =>
            !g.members.some((m) => m.activity.id === selectedId || m.activity.id === hoveredId) &&
            Math.hypot(g.x - p.x, g.y - p.y) < CLUSTER_RADIUS,
        );
    if (target) {
      target.members.push(p);
      target.x = target.members.reduce((s, m) => s + m.x, 0) / target.members.length;
      target.y = target.members.reduce((s, m) => s + m.y, 0) / target.members.length;
    } else {
      groups.push({ x: p.x, y: p.y, members: [p] });
    }
  }

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const selectedPos = selected ? project(selected.location.coordinates) : null;
  const clusterKey = (g: Group) => `c:${g.members.map((m) => m.activity.id).sort().join("|")}`;

  const visibleIds = useMemo(() => new Set(activities.map((a) => a.id)), [activities]);
  const inView = (x: number, y: number) => x > -60 && y > -60 && x < width + 60 && y < height + 80;

  return (
    <div className="pointer-events-none absolute inset-0 isolate overflow-hidden">
      <AnimatePresence>
        {groups.map((g) => {
          if (!inView(g.x, g.y)) return null;
          if (g.members.length === 1) {
            const { activity, x, y } = g.members[0];
            const emphasized = activity.id === hoveredId || activity.id === selectedId;
            return (
              <MapPin
                key={activity.id}
                activity={activity}
                x={x}
                y={y}
                emphasized={emphasized}
                dimmed={!!selectedId && !emphasized}
                onHover={setHoveredId}
                onSelect={setSelectedId}
              />
            );
          }
          const colors = [...new Set(g.members.map((m) => CATEGORIES[m.activity.category].color))];
          return (
            <ClusterBubble
              key={clusterKey(g)}
              count={g.members.length}
              x={g.x}
              y={g.y}
              colors={colors}
              onClick={() => onZoomToCluster(g.members.map((m) => m.activity))}
            />
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {selected && selectedPos && visibleIds.has(selected.id) && inView(selectedPos.x, selectedPos.y) && (
          <MapPopup
            key={selected.id}
            activity={selected}
            x={selectedPos.x}
            y={selectedPos.y}
            paneWidth={width}
            paneHeight={height}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
