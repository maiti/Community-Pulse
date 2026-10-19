"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LngLatBoundsLike, Map as MapboxMap } from "mapbox-gl";
import { useAppState } from "@/lib/app-state";
import { boundsOf } from "@/lib/geo";
import type { Activity, Coordinates } from "@/lib/types";
import { useElementSize } from "@/lib/use-element-size";
import type { MapController } from "./controller";
import { PinLayer } from "./PinLayer";

type Props = {
  token: string;
  allActivities: Activity[];
  activities: Activity[];
  onController: (c: MapController | null) => void;
  onBearing: (deg: number) => void;
  /** Called when tiles can't load (bad token, no WebGL) so the illustrated map can take over. */
  onFail: () => void;
};

const FIT_PADDING = { top: 90, bottom: 110, left: 70, right: 70 };

function toBounds(list: Activity[]): LngLatBoundsLike {
  const b = boundsOf(list.map((a) => a.location.coordinates));
  return [
    [b.west, b.south],
    [b.east, b.north],
  ];
}

export function MapboxCanvas({ token, allActivities, activities, onController, onBearing, onFail }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapboxMap | null>(null);
  const { width, height } = useElementSize(wrapperRef);
  const [, setFrame] = useState(0);
  const { selectedId, setSelectedId, byId } = useAppState();

  const initialBounds = useRef(toBounds(allActivities));
  const callbacks = useRef({ onBearing, onFail, setSelectedId });
  useEffect(() => {
    callbacks.current = { onBearing, onFail, setSelectedId };
  }, [onBearing, onFail, setSelectedId]);

  useEffect(() => {
    let cancelled = false;
    let instance: MapboxMap | null = null;

    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = token;
        const m = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          bounds: initialBounds.current,
          fitBoundsOptions: { padding: FIT_PADDING },
          attributionControl: true,
          cooperativeGestures: false,
        });
        instance = m;
        // Re-render the React pin overlay on every camera frame.
        m.on("move", () => setFrame((f) => f + 1));
        m.on("rotate", () => callbacks.current.onBearing(m.getBearing()));
        m.on("click", () => callbacks.current.setSelectedId(null));
        m.on("load", () => setMap(m));
        m.on("error", (e) => {
          const status = (e.error as { status?: number } | undefined)?.status;
          if (status === 401 || status === 403) callbacks.current.onFail();
        });
      })
      .catch(() => callbacks.current.onFail());

    return () => {
      cancelled = true;
      instance?.remove();
      setMap(null);
    };
  }, [token]);

  useEffect(() => {
    map?.resize();
  }, [map, width, height]);

  // New district: glide to its activities.
  useEffect(() => {
    map?.fitBounds(toBounds(allActivities), { padding: FIT_PADDING, duration: 1400 });
  }, [allActivities, map]);

  useEffect(() => {
    if (!map || !selectedId) return;
    const activity = byId.get(selectedId);
    if (!activity) return;
    const { lat, lng } = activity.location.coordinates;
    map.easeTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 14),
      offset: [0, map.getContainer().clientHeight * 0.16],
      duration: 800,
    });
  }, [selectedId, byId, map]);

  const fitActivities = useCallback(
    (list: Activity[]) => {
      if (!list.length) return;
      map?.fitBounds(toBounds(list), { padding: 90, maxZoom: 16, duration: 700 });
    },
    [map],
  );

  useEffect(() => {
    onController({
      zoomBy: (f) => {
        if (map) map.easeTo({ zoom: map.getZoom() + Math.log2(f), duration: 300 });
      },
      recenter: () => {
        map?.fitBounds(toBounds(allActivities), {
          padding: FIT_PADDING,
          bearing: 0,
          pitch: 0,
          duration: 900,
        });
      },
      fitActivities,
    });
    return () => onController(null);
  }, [onController, allActivities, fitActivities, map]);

  const project = (c: Coordinates) => {
    if (!map) return { x: -999, y: -999 };
    const p = map.project([c.lng, c.lat]);
    return { x: p.x, y: p.y };
  };

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {map && width > 0 && (
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
