import { estimateTravel } from "../geo";
import type { Activity, CategoryId } from "../types";
import {
  clip,
  fetchJson,
  formatDuration,
  hourFloor,
  joinAddress,
  pickImage,
  SourceSkipped,
  type SearchContext,
  type SourceResult,
} from "./shared";

const ENDPOINT = "https://app.ticketmaster.com/discovery/v2/events.json";
const MAX_RESULTS = 25;
const LOOKAHEAD_DAYS = 45;
const KM_PER_MILE = 1.609;

type TmImage = { url: string; ratio?: string; width: number };
type TmVenue = {
  name?: string;
  city?: { name?: string };
  address?: { line1?: string };
  location?: { latitude?: string; longitude?: string };
};
type TmEvent = {
  id: string;
  name: string;
  url?: string;
  info?: string;
  pleaseNote?: string;
  images?: TmImage[];
  dates?: { start?: { localDate?: string; localTime?: string }; status?: { code?: string } };
  /** `family` marks events Ticketmaster classifies as family-friendly. */
  classifications?: { segment?: { name?: string }; genre?: { name?: string }; family?: boolean }[];
  priceRanges?: { min?: number; currency?: string }[];
  ageRestrictions?: { legalAgeEnforced?: boolean };
  promoter?: { name?: string };
  _embedded?: { venues?: TmVenue[] };
};
type TmResponse = { _embedded?: { events?: TmEvent[] } };

/** How Ticketmaster segments land in our categories, with a typical length in minutes. */
const SEGMENTS: Record<string, { category: CategoryId; vibes: CategoryId[]; minutes: number }> = {
  "Arts & Theatre": { category: "arts", vibes: ["arts"], minutes: 120 },
  Music: { category: "arts", vibes: ["arts", "social"], minutes: 150 },
  Film: { category: "arts", vibes: ["arts", "social"], minutes: 120 },
  Family: { category: "social", vibes: ["social", "games"], minutes: 120 },
  Sports: { category: "social", vibes: ["social"], minutes: 180 },
  Miscellaneous: { category: "social", vibes: ["social"], minutes: 120 },
};
const DEFAULT_SEGMENT = SEGMENTS.Miscellaneous;

// This feed is for teens, so drop anything marked 18+ or 21+.
const ADULTS_ONLY = /\b(18|21)\s*\+|\b(18|21)\s*(and|&)\s*(over|up|older)|\bages?\s*(18|21)\b|\bover\s*21\b/i;
// Club shows and comedy often run 18+/21+ without Ticketmaster flagging it,
// so those only count when the listing says a teen can get in.
const NEEDS_ALL_AGES = new Set(["Music", "Miscellaneous", "Undefined", ""]);
const NEEDS_ALL_AGES_GENRES = new Set(["Comedy"]);
const TEEN_OK = /\ball[- ]ages\b|\bfamily\b|\b([5-9]|1[0-4])\s*(\+|(and|&)\s*(over|up|older))/i;
// Upsells listed as their own "events".
const ADD_ONS = /\b(vip packages?|parking|upgrades?|suites?|premium seating|hotel packages?)\b/i;

const tmTime = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

function bestImage(images: TmImage[] = []) {
  // Prefer a mid-size landscape crop: sharp in a 138px thumb without a 2 MB download.
  const sized = images.filter((i) => i.width >= 500 && i.width <= 1200);
  return (sized.find((i) => i.ratio === "3_2") ?? sized.find((i) => i.ratio === "16_9") ?? images[0])?.url;
}

function toActivity(event: TmEvent, ctx: SearchContext): Activity | null {
  const venue = event._embedded?.venues?.[0];
  const lat = Number(venue?.location?.latitude);
  const lng = Number(venue?.location?.longitude);
  const start = event.dates?.start;
  if (!venue || !Number.isFinite(lat) || !Number.isFinite(lng) || !start?.localDate) return null;
  if (event.ageRestrictions?.legalAgeEnforced) return null;
  if (ADULTS_ONLY.test([event.name, event.info, event.pleaseNote].join(" "))) return null;
  if (ADD_ONS.test(event.name)) return null;
  if (["cancelled", "postponed"].includes(event.dates?.status?.code ?? "")) return null;

  const segmentName = event.classifications?.[0]?.segment?.name ?? "";
  const rawGenre = event.classifications?.[0]?.genre?.name;
  const family = event.classifications?.some((c) => c.family) ?? false;
  const needsAllAges = !family && (NEEDS_ALL_AGES.has(segmentName) || NEEDS_ALL_AGES_GENRES.has(rawGenre ?? ""));
  if (needsAllAges && !TEEN_OK.test([event.name, event.info, event.pleaseNote].join(" "))) return null;
  const genre = rawGenre && !["Undefined", "Other"].includes(rawGenre) ? rawGenre : undefined;
  const segment = SEGMENTS[segmentName] ?? DEFAULT_SEGMENT;
  const venueName = venue.name ?? "Venue";
  const coordinates = { lat, lng };

  // Without a start time, show the day and "Time TBA" rather than inventing a time.
  const date = start.localTime
    ? `${start.localDate}T${start.localTime}`
    : `${new Date(`${start.localDate}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })} · Time TBA`;

  const price = event.priceRanges?.[0];
  const tags = [
    genre ?? (segmentName && segmentName !== "Undefined" ? segmentName : "Live event"),
    price?.min === 0 ? "Free" : price?.min ? `From $${Math.round(price.min)}` : null,
    "Tickets",
  ].filter((t): t is string => !!t);

  const id = `tm-${event.id}`;
  return {
    id,
    source: "ticketmaster",
    type: "event",
    category: segment.category,
    title: event.name,
    organization: event.promoter?.name ?? venueName,
    description: clip(
      event.info ||
        event.pleaseNote ||
        `${genre ? `${genre} ` : ""}${segment === DEFAULT_SEGMENT ? "event" : segmentName.toLowerCase()} at ${venueName}.`,
    ),
    location: {
      name: venueName,
      address: joinAddress(venue.address?.line1, venue.city?.name),
      coordinates,
    },
    date,
    activityDuration: `About ${formatDuration(segment.minutes)}`,
    durationRange: { min: segment.minutes - 30, max: segment.minutes + 30 },
    ...estimateTravel(ctx.center, coordinates),
    tags,
    vibeCategories: segment.vibes,
    imageUrl: pickImage(bestImage(event.images), segment.category, id),
    signupUrl: event.url ?? `https://www.ticketmaster.com/search?q=${encodeURIComponent(event.name)}`,
  };
}

/** Upcoming arts, culture and social events near the centre, from the Ticketmaster Discovery API. */
export async function fetchTicketmasterEvents(ctx: SearchContext): Promise<SourceResult> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) throw new SourceSkipped("Add TICKETMASTER_API_KEY to enable Ticketmaster events.");

  const from = hourFloor(ctx.now);
  const until = new Date(from.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  const search = (extra: Record<string, string>) => {
    const params = new URLSearchParams({
      apikey: apiKey,
      latlong: `${ctx.center.lat},${ctx.center.lng}`,
      radius: String(Math.max(2, Math.round(ctx.radiusKm / KM_PER_MILE))),
      unit: "miles",
      sort: "date,asc",
      startDateTime: tmTime(from),
      endDateTime: tmTime(until),
      ...extra,
    });
    return fetchJson<TmResponse>("Ticketmaster", `${ENDPOINT}?${params}`, { revalidate: 900 });
  };

  // Tonight's club shows fill the first page of a date-sorted search, so family
  // events get their own search and go first. Most club shows are filtered out,
  // so the general search asks for a deeper page.
  const pages = await Promise.allSettled([search({ classificationName: "Family", size: "50" }), search({ size: "120" })]);
  if (pages.every((p) => p.status === "rejected")) throw (pages[1] as PromiseRejectedResult).reason;
  const events = pages.flatMap((p) => (p.status === "fulfilled" ? (p.value._embedded?.events ?? []) : []));

  // Tours and residencies repeat; keep the soonest date of each show at each venue.
  const seen = new Set<string>();
  const activities: Activity[] = [];
  const cities: string[] = [];
  for (const event of events) {
    const activity = toActivity(event, ctx);
    if (!activity) continue;
    const key = `${activity.title.toLowerCase()}|${activity.location.name.toLowerCase()}`;
    if (seen.has(key) || seen.has(activity.id)) continue;
    seen.add(key);
    seen.add(activity.id);
    activities.push(activity);
    const city = event._embedded?.venues?.[0]?.city?.name;
    if (city) cities.push(city);
    if (activities.length >= MAX_RESULTS) break;
  }
  return { activities, cities };
}
