import { estimateTravel, haversineKm } from "../geo";
import type { Activity, CategoryId } from "../types";
import {
  clip,
  fetchJson,
  formatDuration,
  hourFloor,
  joinAddress,
  pickImage,
  SourceSkipped,
  UpstreamError,
  type SearchContext,
  type SourceResult,
} from "./shared";

const API = "https://www.eventbriteapi.com/v3";
const MAX_RESULTS = 15;
const LOOKAHEAD_DAYS = 30;

type EbVenue = {
  name?: string;
  latitude?: string;
  longitude?: string;
  address?: { address_1?: string; city?: string; localized_address_display?: string };
};
type EbEvent = {
  id: string;
  name?: { text?: string };
  summary?: string;
  description?: { text?: string };
  url?: string;
  start?: { utc?: string; local?: string };
  end?: { utc?: string };
  is_free?: boolean;
  online_event?: boolean;
  logo?: { url?: string };
  venue?: EbVenue | null;
  category?: { short_name?: string } | null;
  organizer?: { name?: string } | null;
};
type EbPage = { events?: EbEvent[] };

/**
 * Eventbrite category → our category. Keywords run first so a "Community"
 * event called "Park Cleanup" still lands in Volunteer.
 */
const KEYWORDS: [RegExp, CategoryId, CategoryId[]][] = [
  [/volunteer|clean[- ]?up|food (bank|drive)|service (day|hours)|mentor/i, "volunteer", ["volunteer", "social"]],
  [/workshop|class|hackathon|coding|tutor|study|lesson/i, "study", ["study", "arts"]],
  [/board game|game night|esports|chess|trivia/i, "games", ["games", "social"]],
];
const CATEGORY_MAP: Record<string, [CategoryId, CategoryId[]]> = {
  "Charity & Causes": ["volunteer", ["volunteer", "social"]],
  Community: ["social", ["social", "volunteer"]],
  "Family & Education": ["study", ["study", "social"]],
  "Science & Tech": ["study", ["study"]],
  Arts: ["arts", ["arts"]],
  "Film & Media": ["arts", ["arts", "social"]],
  Music: ["arts", ["arts", "social"]],
  Hobbies: ["games", ["games", "social"]],
  "Sports & Fitness": ["outdoors", ["outdoors", "social"]],
  "Travel & Outdoor": ["outdoors", ["outdoors"]],
};

function classify(event: EbEvent): [CategoryId, CategoryId[]] {
  const text = `${event.name?.text ?? ""} ${event.summary ?? ""}`;
  for (const [pattern, category, vibes] of KEYWORDS) if (pattern.test(text)) return [category, vibes];
  return CATEGORY_MAP[event.category?.short_name ?? ""] ?? ["social", ["social"]];
}

function toActivity(event: EbEvent, ctx: SearchContext): Activity | null {
  const venue = event.venue;
  const lat = Number(venue?.latitude);
  const lng = Number(venue?.longitude);
  const title = event.name?.text?.trim();
  if (event.online_event || !venue || !title || !event.start?.local || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const coordinates = { lat, lng };
  // Organizer feeds aren't location-filtered, so drop anything outside the search area.
  if (haversineKm(ctx.center, coordinates) > ctx.radiusKm * 1.5) return null;
  const startMs = Date.parse(event.start.utc ?? "");
  if (!(startMs > ctx.now.getTime())) return null;

  const [category, vibes] = classify(event);
  const minutes = Math.round((Date.parse(event.end?.utc ?? "") - startMs) / 60000);
  // Multi-week series report their final end date; treat those as a typical session.
  const singleSession = minutes > 0 && minutes <= 8 * 60;
  const id = `eb-${event.id}`;

  return {
    id,
    source: "eventbrite",
    type: "event",
    category,
    title,
    organization: event.organizer?.name ?? venue.name ?? "Eventbrite organizer",
    description: clip(event.summary || event.description?.text || `Community event at ${venue.name ?? "a local venue"}.`),
    location: {
      name: venue.name ?? "Event venue",
      address: venue.address?.localized_address_display ?? joinAddress(venue.address?.address_1, venue.address?.city),
      coordinates,
    },
    date: event.start.local,
    activityDuration: singleSession ? formatDuration(minutes) : "Multi-session",
    durationRange: singleSession ? { min: minutes, max: minutes } : { min: 60, max: 180 },
    ...estimateTravel(ctx.center, coordinates),
    tags: [event.is_free ? "Free" : "Tickets", event.category?.short_name ?? "Community"],
    vibeCategories: vibes,
    imageUrl: pickImage(event.logo?.url, category, id),
    signupUrl: event.url ?? `https://www.eventbrite.com/e/${event.id}`,
  };
}

// Eventbrite shut down public event search in 2020. Remember that per server
// instance so every request doesn't pay for a guaranteed 404.
let searchRetired = false;

async function searchNearby(token: string, ctx: SearchContext): Promise<EbEvent[] | null> {
  if (searchRetired) return null;
  const from = hourFloor(ctx.now);
  const params = new URLSearchParams({
    "location.latitude": String(ctx.searchCenter.lat),
    "location.longitude": String(ctx.searchCenter.lng),
    "location.within": `${Math.round(ctx.radiusKm)}km`,
    "start_date.range_start": from.toISOString().replace(/\.\d{3}Z$/, "Z"),
    expand: "venue,category,organizer",
  });
  try {
    const page = await fetchJson<EbPage>("Eventbrite", `${API}/events/search/?${params}`, {
      revalidate: 900,
      headers: { Authorization: `Bearer ${token}` },
    });
    return page.events ?? [];
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 404) {
      searchRetired = true;
      return null;
    }
    throw err;
  }
}

async function organizerEvents(token: string, organizerIds: string[]): Promise<EbEvent[]> {
  const pages = await Promise.allSettled(
    organizerIds.map((id) =>
      fetchJson<EbPage>("Eventbrite", `${API}/organizers/${encodeURIComponent(id)}/events/?status=live&order_by=start_asc&expand=venue,category,organizer`, {
        revalidate: 1800,
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  );
  const ok = pages.filter((p): p is PromiseFulfilledResult<EbPage> => p.status === "fulfilled");
  if (!ok.length && pages.length) throw (pages[0] as PromiseRejectedResult).reason;
  return ok.flatMap((p) => p.value.events ?? []);
}

/**
 * Local volunteer, workshop and community events from Eventbrite. Tries the
 * location search first, then falls back to the organizers listed in
 * EVENTBRITE_ORGANIZER_IDS.
 */
export async function fetchEventbriteEvents(ctx: SearchContext): Promise<SourceResult> {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) throw new SourceSkipped("Add EVENTBRITE_API_TOKEN to enable Eventbrite events.");
  const organizerIds = (process.env.EVENTBRITE_ORGANIZER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let events = await searchNearby(token, ctx);
  let note: string | undefined;
  if (events === null) {
    if (!organizerIds.length) {
      throw new SourceSkipped(
        "Eventbrite retired its public location search. Add organizer IDs to EVENTBRITE_ORGANIZER_IDS to pull their events.",
      );
    }
    events = await organizerEvents(token, organizerIds);
    note = `From ${organizerIds.length} followed ${organizerIds.length === 1 ? "organizer" : "organizers"}`;
  }

  const until = ctx.now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  const activities: Activity[] = [];
  const cities: string[] = [];
  const sorted = [...events].sort((a, b) => Date.parse(a.start?.utc ?? "") - Date.parse(b.start?.utc ?? ""));
  for (const event of sorted) {
    if (Date.parse(event.start?.utc ?? "") > until) continue;
    const activity = toActivity(event, ctx);
    // Weekly series repeat the same title; keep the next occurrence.
    if (!activity || seen.has(activity.title.toLowerCase())) continue;
    seen.add(activity.title.toLowerCase());
    activities.push(activity);
    if (event.venue?.address?.city) cities.push(event.venue.address.city);
    if (activities.length >= MAX_RESULTS) break;
  }
  return { activities, cities, note };
}
