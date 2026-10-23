"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, LngLatBoundsLike, Map as MapboxMap } from "mapbox-gl";
import type { DistrictGeometry } from "@/lib/api/district";
import { useAppState } from "@/lib/app-state";
import { boundsOf } from "@/lib/geo";
import type { Activity, Coordinates } from "@/lib/types";
import { useElementSize } from "@/lib/use-element-size";
import type { MapController } from "./controller";
import { PinLayer } from "./PinLayer";

type Props = {
  token: string;
  /** Points the default view should fit: every listing in the district. */
  frame: Coordinates[];
  activities: Activity[];
  /** Real district outline from the Census, when there is one. */
  boundary: DistrictGeometry | null;
  onController: (c: MapController | null) => void;
  onBearing: (deg: number) => void;
  /** Called when tiles can't load (bad token, no WebGL) so the illustrated map can take over. */
  onFail: () => void;
};

const FIT_PADDING = { top: 90, bottom: 110, left: 70, right: 70 };
const BOUNDARY_SOURCE = "district-boundary";
const EMPTY = { type: "FeatureCollection" as const, features: [] };

function toBounds(points: Coordinates[]): LngLatBoundsLike {
  const b = boundsOf(points);
  return [
    [b.west, b.south],
    [b.east, b.north],
  ];
}

export function MapboxCanvas({ token, frame, activities, boundary, onController, onBearing, onFail }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapboxMap | null>(null);
  const { width, height } = useElementSize(wrapperRef);
  const [, setFrame] = useState(0);
  const { selectedId, setSelectedId, byId } = useAppState();

  const initialBounds = useRef(toBounds(frame));
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

  // District outline: a faint wash plus the same dashed teal line as the illustrated map.
  useEffect(() => {
    if (!map) return;
    const data = boundary ? { type: "Feature" as const, properties: {}, geometry: boundary } : EMPTY;
    const source = map.getSource(BOUNDARY_SOURCE) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }
    map.addSource(BOUNDARY_SOURCE, { type: "geojson", data });
    // Below the first label layer, so street and place names stay readable.
    const beforeId = map.getStyle()?.layers?.find((l) => l.type === "symbol")?.id;
    map.addLayer(
      { id: "district-fill", type: "fill", source: BOUNDARY_SOURCE, paint: { "fill-color": "#009C9F", "fill-opacity": 0.06 } },
      beforeId,
    );
    map.addLayer(
      {
        id: "district-line",
        type: "line",
        source: BOUNDARY_SOURCE,
        paint: { "line-color": "#009C9F", "line-width": 2, "line-opacity": 0.75, "line-dasharray": [3.5, 3] },
      },
      beforeId,
    );
  }, [map, boundary]);

  // New district: glide to its activities.
  useEffect(() => {
    map?.fitBounds(toBounds(frame), { padding: FIT_PADDING, duration: 1400 });
  }, [frame, map]);

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
      map?.fitBounds(toBounds(list.map((a) => a.location.coordinates)), { padding: 90, maxZoom: 16, duration: 700 });
    },
    [map],
  );

  useEffect(() => {
    onController({
      zoomBy: (f) => {
        if (map) map.easeTo({ zoom: map.getZoom() + Math.log2(f), duration: 300 });
      },
      recenter: () => {
        map?.fitBounds(toBounds(frame), {
          padding: FIT_PADDING,
          bearing: 0,
          pitch: 0,
          duration: 900,
        });
      },
      fitActivities,
    });
    return () => onController(null);
  }, [onController, frame, fitActivities, map]);

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
