"use client";

import { useEffect, useState } from "react";
import { curatedAround } from "./curated";
import type { FeedResponse, LocationProfile, QuizPrefs } from "./types";

/**
 * loading: nothing to show yet for this location.
 * refreshing: showing the previous results while new filters load.
 * offline: the API route couldn't be reached; showing bundled samples.
 */
export type FeedStatus = "loading" | "refreshing" | "ready" | "offline";

type Result = { url: string; locationKey: string; data: FeedResponse; offline: boolean };

const DEBOUNCE_MS = 250;

function offlineFeed(profile: LocationProfile): FeedResponse {
  return {
    activities: curatedAround(profile.centroid),
    sources: [],
    liveCount: 0,
    usedFallback: true,
    areaLabel: null,
    center: profile.centroid,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Fetches /api/activities for the active location and quiz picks. Results
 * for the same location stay on screen while new filters load, so tweaking
 * the quiz doesn't flash the feed; a new location starts from skeletons.
 */
export function useLiveActivities(profile: LocationProfile, prefs: QuizPrefs | null) {
  const { lat, lng } = profile.centroid;
  const locationKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const params = new URLSearchParams({ lat: lat.toFixed(3), lng: lng.toFixed(3), district: profile.code });
  if (prefs?.vibes.length) params.set("vibe", [...prefs.vibes].sort().join(","));
  if (prefs?.modes.length) params.set("transport", [...prefs.modes].sort().join(","));
  const url = `/api/activities?${params}`;

  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as FeedResponse;
        setResult({ url, locationKey, data, offline: false });
      } catch {
        if (controller.signal.aborted) return;
        setResult({ url, locationKey, data: offlineFeed(profile), offline: true });
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // `url` already encodes everything the request depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const current = result?.locationKey === locationKey ? result : null;
  const status: FeedStatus = !current
    ? "loading"
    : current.url !== url
      ? "refreshing"
      : current.offline
        ? "offline"
        : "ready";

  return { data: current?.data ?? null, status };
}
