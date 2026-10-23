import { curatedAround } from "../curated";
import { haversineKm } from "../geo";
import type { Activity, CategoryId, Coordinates, FeedResponse, LiveSourceId, SourceStatus, TravelMode } from "../types";
import { fetchEventbriteEvents } from "./eventbrite";
import { fetchGooglePlaces } from "./googlePlaces";
import { fetchOpenStreetMap } from "./openStreetMap";
import { radiusForModes, snapToGrid, SourceSkipped, type SearchContext, type SourceResult } from "./shared";
import { fetchTicketmasterEvents } from "./ticketmaster";

/** Below this many live listings, curated samples are merged in so the feed never looks empty. */
export const MIN_LIVE_ITEMS = 8;

const SOURCES: { id: LiveSourceId; label: string; load: (ctx: SearchContext) => Promise<SourceResult> }[] = [
  { id: "eventbrite", label: "Eventbrite", load: fetchEventbriteEvents },
  { id: "ticketmaster", label: "Ticketmaster", load: fetchTicketmasterEvents },
  { id: "google", label: "Google Places", load: fetchGooglePlaces },
  // Last, so a place Google also lists keeps Google's ratings and hours.
  { id: "osm", label: "OpenStreetMap", load: fetchOpenStreetMap },
];

export type FeedQuery = {
  center: Coordinates;
  vibes: CategoryId[];
  modes: TravelMode[];
};

const normalName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Two sources describing one real place: the same name close by, or the same
 * kind of place ("Library") at nearly the same spot under different names.
 */
function samePlace(a: Activity, b: Activity) {
  if (a.type !== "space" || b.type !== "space") return false;
  const km = haversineKm(a.location.coordinates, b.location.coordinates);
  return (normalName(a.title) === normalName(b.title) && km < 0.5) || (a.organization === b.organization && km < 0.08);
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * Query every live source at once. One failing or unconfigured source never
 * blocks the others; each reports its own status alongside the results.
 */
export async function loadFeed(query: FeedQuery, now = new Date()): Promise<FeedResponse> {
  const ctx: SearchContext = {
    center: query.center,
    searchCenter: snapToGrid(query.center),
    radiusKm: radiusForModes(query.modes),
    vibes: query.vibes,
    now,
  };
  const settled = await Promise.allSettled(SOURCES.map((s) => s.load(ctx)));

  const live: Activity[] = [];
  const cities: string[] = [];
  const seen = new Set<string>();
  const sources = settled.map((result, i): SourceStatus => {
    const { id, label } = SOURCES[i];
    if (result.status === "rejected") {
      const reason = result.reason;
      if (reason instanceof SourceSkipped) return { id, label, state: "skipped", count: 0, note: reason.message };
      console.error(`[activities] ${label} failed:`, reason instanceof Error ? reason.message : reason);
      return { id, label, state: "error", count: 0, note: reason instanceof Error ? reason.message : "Request failed" };
    }
    const fresh = result.value.activities.filter((a) => !seen.has(a.id) && !live.some((b) => samePlace(a, b)));
    fresh.forEach((a) => seen.add(a.id));
    live.push(...fresh);
    cities.push(...result.value.cities);
    return { id, label, state: fresh.length ? "ok" : "empty", count: fresh.length, note: result.value.note };
  });

  const usedFallback = live.length < MIN_LIVE_ITEMS;
  return {
    activities: usedFallback ? [...live, ...curatedAround(query.center)] : live,
    sources,
    liveCount: live.length,
    usedFallback,
    areaLabel: mostCommon(cities),
    center: query.center,
    generatedAt: now.toISOString(),
  };
}
