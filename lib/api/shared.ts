import { CATEGORY_IMAGES } from "../curated";
import type { Activity, CategoryId, Coordinates, TravelMode } from "../types";
import { hashString } from "../utils";

/** What every source adapter receives. */
export type SearchContext = {
  center: Coordinates;
  radiusKm: number;
  /** Quiz vibes; empty means no preference. */
  vibes: CategoryId[];
  now: Date;
};

export type SourceResult = {
  activities: Activity[];
  /** Venue cities, used to name the area for detected locations. */
  cities: string[];
  note?: string;
};

/** Thrown when a source has no key or config, so it is reported as skipped rather than failed. */
export class SourceSkipped extends Error {}

export class UpstreamError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 8000;

/**
 * Fetch JSON from a third-party API with a timeout and Next's data cache.
 * Error messages never include the URL, because some APIs take keys in the query string.
 */
export async function fetchJson<T>(
  source: string,
  url: string,
  { revalidate, ...init }: RequestInit & { revalidate: number },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate } });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new UpstreamError(0, timedOut ? `${source} timed out` : `${source} could not be reached`);
  }
  if (!res.ok) {
    const reason =
      res.status === 429
        ? "rate limit reached"
        : res.status === 401 || res.status === 403
          ? `API key was rejected (HTTP ${res.status})`
          : `HTTP ${res.status}`;
    throw new UpstreamError(res.status, `${source}: ${reason}`);
  }
  return (await res.json()) as T;
}

/** Search radius grows with the slowest-to-fastest travel mode someone picked. */
const MODE_RADIUS_KM: Record<TravelMode, number> = { walk: 2.5, bike: 6, transit: 10, ride: 16 };
export const DEFAULT_RADIUS_KM = 8;

export function radiusForModes(modes: TravelMode[]) {
  return modes.length ? Math.max(...modes.map((m) => MODE_RADIUS_KM[m])) : DEFAULT_RADIUS_KM;
}

/**
 * Hosts next/image may load (keep in sync with `images.remotePatterns` in
 * next.config.ts). Anything else falls back to a category photo.
 */
const IMAGE_HOSTS = ["images.unsplash.com", "s1.ticketm.net", "img.evbuc.com"];

export function pickImage(candidate: string | undefined, category: CategoryId, seed: string) {
  if (candidate) {
    try {
      if (IMAGE_HOSTS.includes(new URL(candidate).hostname)) return candidate;
    } catch {
      // Malformed URL: fall through to a category photo.
    }
  }
  const pool = CATEGORY_IMAGES[category];
  return pool[hashString(seed) % pool.length];
}

export function clip(text: string, max = 240) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** "120 min" → "2 hrs", "90 min" → "1.5 hrs", "45 min" → "45 min". */
export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 2) / 2;
  return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
}

/** Round to the hour so time-window query strings stay cacheable. */
export function hourFloor(date: Date) {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

/** Venue names sometimes appear without a usable address; keep the card tidy. */
export function joinAddress(...parts: (string | undefined | null)[]) {
  return parts.filter(Boolean).join(", ");
}
