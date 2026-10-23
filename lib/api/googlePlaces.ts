import { estimateTravel, haversineKm } from "../geo";
import type { Activity, CategoryId, Coordinates } from "../types";
import { fetchJson, pickImage, SourceSkipped, UpstreamError, type SearchContext, type SourceResult } from "./shared";

const NEARBY_NEW = "https://places.googleapis.com/v1/places:searchNearby";
const TEXT_NEW = "https://places.googleapis.com/v1/places:searchText";
const NEARBY_LEGACY = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const MAX_RADIUS_KM = 6;
const REVALIDATE = 6 * 60 * 60;

type PlaceKind =
  | "library"
  | "park"
  | "cafe"
  | "bowling_alley"
  | "community_center"
  | "food_bank"
  | "youth_center"
  | "community_garden";

/**
 * The third-space amenities we search for, and how each reads in the feed.
 * Kinds with a `text` query have no Google place type, so they use Text
 * Search, and `keep` checks the name so a loose match doesn't slip in.
 */
const KINDS: Record<
  PlaceKind,
  {
    category: CategoryId;
    vibes: CategoryId[];
    label: string;
    free: boolean;
    range: [number, number];
    blurb: string;
    /** Text Search query, the legacy API keyword, and a name check for each hit. */
    text?: { query: string; keyword: string; keep: RegExp };
  }
> = {
  library: {
    category: "study",
    vibes: ["study"],
    label: "Library",
    free: true,
    range: [30, 240],
    blurb: "A free, quiet place to study, read, or work on projects. Many branches run teen programs, so ask at the desk.",
  },
  park: {
    category: "outdoors",
    vibes: ["outdoors", "social"],
    label: "Park",
    free: true,
    range: [30, 180],
    blurb: "Open green space to walk, play pickup games, or meet friends outside. No ticket, no reservation.",
  },
  cafe: {
    category: "social",
    vibes: ["social", "study"],
    label: "Café",
    free: false,
    range: [20, 120],
    blurb: "A neighborhood café for catching up with friends or settling in with homework over a drink.",
  },
  bowling_alley: {
    category: "games",
    vibes: ["games", "social"],
    label: "Bowling alley",
    free: false,
    range: [60, 180],
    blurb: "Lanes, arcade games, and snacks. A good pick for a group outing.",
  },
  community_center: {
    category: "social",
    vibes: ["social", "volunteer"],
    label: "Community center",
    free: true,
    range: [30, 180],
    blurb: "A neighborhood hub for drop-in programs, classes, and volunteer projects. Check the front desk for teen hours.",
  },
  food_bank: {
    category: "volunteer",
    vibes: ["volunteer", "social"],
    label: "Food bank",
    free: true,
    range: [120, 180],
    blurb: "Sort, pack, and hand out groceries for neighbors who need them. Most shifts welcome teens with a parent permission form, and they count toward service hours.",
    text: { query: "food bank or food pantry", keyword: "food bank", keep: /food|pantry|hunger|meals?\b|kitchen/i },
  },
  youth_center: {
    category: "social",
    vibes: ["social", "games", "volunteer"],
    label: "Youth center",
    free: true,
    range: [60, 180],
    blurb: "A drop-in space built for teens: homework help, games, and programs run by staff and other young people.",
    text: { query: "youth center or teen center", keyword: "youth center", keep: /youth|teen|boys|girls|\bclub\b|ymca|young/i },
  },
  community_garden: {
    category: "volunteer",
    vibes: ["volunteer", "outdoors"],
    label: "Community garden",
    free: true,
    range: [60, 180],
    blurb: "Neighbors grow food together here. Workdays welcome volunteers, and no gardening experience is needed.",
    text: { query: "community garden", keyword: "community garden", keep: /garden|farm|orchard/i },
  },
};

// Campus and specialist libraries usually need a student or staff ID.
const PRIVATE_LIBRARY = /universit|college|campus|school of|law library|medical|seminary|institute|archive/i;
const CAMPUS_TYPES = ["university", "school", "primary_school", "secondary_school"];
const ALL_KINDS = Object.keys(KINDS) as PlaceKind[];

/** Only search the amenities that fit the quiz vibes, so results are deeper rather than wider. */
function kindsFor(vibes: CategoryId[]): PlaceKind[] {
  if (!vibes.length) return ALL_KINDS;
  const matched = ALL_KINDS.filter((k) => vibes.some((v) => KINDS[k].vibes.includes(v)));
  return matched.length ? matched : ALL_KINDS;
}

/** Normalised fields shared by the new and legacy APIs. */
type RawPlace = {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  rating?: number;
  ratingCount?: number;
  mapsUrl: string;
  /** e.g. "Tue · 9:00 AM – 8:00 PM"; the weekday is named so a cached label stays accurate. */
  hours: string;
  city?: string;
  /** Google place types, e.g. ["library", "university"]. */
  types: string[];
};

function todaysHours(descriptions: string[] | undefined, utcOffsetMinutes: number | undefined, now: Date) {
  if (!descriptions?.length) return "Hours vary";
  const local = new Date(now.getTime() + (utcOffsetMinutes ?? 0) * 60_000);
  const line = descriptions[(local.getUTCDay() + 6) % 7] ?? ""; // Google lists Monday first
  const split = line.indexOf(": ");
  if (split < 0) return line || "Hours vary";
  return `${line.slice(0, 3)} · ${line.slice(split + 2)}`;
}

type NewPlace = {
  id: string;
  displayName?: { text?: string };
  shortFormattedAddress?: string;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  utcOffsetMinutes?: number;
  businessStatus?: string;
  types?: string[];
};

const FIELD_MASK = [
  "id",
  "displayName",
  "shortFormattedAddress",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "regularOpeningHours.weekdayDescriptions",
  "utcOffsetMinutes",
  "businessStatus",
  "types",
]
  .map((f) => `places.${f}`)
  .join(",");

async function searchNew(key: string, kind: PlaceKind, ctx: SearchContext, count: number): Promise<RawPlace[]> {
  const circle = {
    center: { latitude: ctx.center.lat, longitude: ctx.center.lng },
    radius: Math.min(ctx.radiusKm, MAX_RADIUS_KM) * 1000,
  };
  const text = KINDS[kind].text;
  const body = text
    ? // Text Search only takes a circle as a bias, so results are trimmed to the radius below.
      { textQuery: text.query, pageSize: count, locationBias: { circle } }
    : {
        // Primary type only: a restaurant that also lists "cafe" isn't a third space.
        includedPrimaryTypes: [kind],
        maxResultCount: count,
        rankPreference: "POPULARITY",
        locationRestriction: { circle },
      };
  const data = await fetchJson<{ places?: NewPlace[] }>("Google Places", text ? TEXT_NEW : NEARBY_NEW, {
    method: "POST",
    revalidate: REVALIDATE,
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify(body),
  });
  return (data.places ?? []).flatMap((p): RawPlace[] => {
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;
    const name = p.displayName?.text;
    if (lat == null || lng == null || !name || (p.businessStatus && p.businessStatus !== "OPERATIONAL")) return [];
    return [
      {
        id: p.id,
        name,
        address: p.shortFormattedAddress ?? p.formattedAddress ?? "",
        coordinates: { lat, lng },
        rating: p.rating,
        ratingCount: p.userRatingCount,
        mapsUrl: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
        hours: todaysHours(p.regularOpeningHours?.weekdayDescriptions, p.utcOffsetMinutes, ctx.now),
        // formattedAddress ends "City, ST 94102, USA"; the city is third from the end.
        city: p.formattedAddress?.split(", ").at(-3),
        types: p.types ?? [],
      },
    ];
  });
}

type LegacyPlace = {
  place_id: string;
  name?: string;
  vicinity?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  business_status?: string;
  types?: string[];
};

async function searchLegacy(key: string, kind: PlaceKind, ctx: SearchContext, count: number): Promise<RawPlace[]> {
  const params = new URLSearchParams({
    location: `${ctx.center.lat},${ctx.center.lng}`,
    radius: String(Math.min(ctx.radiusKm, MAX_RADIUS_KM) * 1000),
    key,
  });
  // The legacy API has no community_center type; a keyword search covers it.
  const text = KINDS[kind].text;
  if (text) params.set("keyword", text.keyword);
  else if (kind === "community_center") params.set("keyword", "community center");
  else params.set("type", kind);

  const data = await fetchJson<{ status: string; results?: LegacyPlace[] }>("Google Places", `${NEARBY_LEGACY}?${params}`, {
    revalidate: REVALIDATE,
  });
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new UpstreamError(data.status === "OVER_QUERY_LIMIT" ? 429 : 403, `Google Places: ${data.status}`);
  }
  return (data.results ?? []).slice(0, count).flatMap((p): RawPlace[] => {
    const lat = p.geometry?.location?.lat;
    const lng = p.geometry?.location?.lng;
    if (lat == null || lng == null || !p.name || (p.business_status && p.business_status !== "OPERATIONAL")) return [];
    return [
      {
        id: p.place_id,
        name: p.name,
        address: p.vicinity ?? "",
        coordinates: { lat, lng },
        rating: p.rating,
        ratingCount: p.user_ratings_total,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
        hours: p.opening_hours?.open_now === undefined ? "Hours vary" : p.opening_hours.open_now ? "Open now" : "Closed now",
        types: p.types ?? [],
      },
    ];
  });
}

function compactCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);
}

function toActivity(place: RawPlace, kind: PlaceKind, ctx: SearchContext): Activity {
  const meta = KINDS[kind];
  const id = `gp-${place.id}`;
  const tags = [
    meta.label,
    meta.free ? "Free entry" : null,
    place.rating ? `★ ${place.rating.toFixed(1)}${place.ratingCount ? ` (${compactCount(place.ratingCount)})` : ""}` : null,
  ].filter((t): t is string => !!t);

  return {
    id,
    source: "google",
    type: "space",
    category: meta.category,
    title: place.name,
    organization: meta.label,
    description: meta.blurb,
    location: { name: place.name, address: place.address, coordinates: place.coordinates },
    date: place.hours,
    activityDuration: "Drop in",
    durationRange: { min: meta.range[0], max: meta.range[1] },
    ...estimateTravel(ctx.center, place.coordinates),
    tags,
    vibeCategories: meta.vibes,
    imageUrl: pickImage(undefined, meta.category, id),
    signupUrl: place.mapsUrl,
  };
}

/** Drops places a teen can't use, and Text Search hits outside the radius or off-topic. */
function fits(place: RawPlace, kind: PlaceKind, ctx: SearchContext) {
  if (kind === "library" && (PRIVATE_LIBRARY.test(place.name) || place.types.some((t) => CAMPUS_TYPES.includes(t)))) {
    return false;
  }
  const text = KINDS[kind].text;
  if (!text) return true;
  return text.keep.test(place.name) && haversineKm(ctx.center, place.coordinates) <= Math.min(ctx.radiusKm, MAX_RADIUS_KM) * 1.2;
}

/** Libraries, parks, cafés, bowling alleys, community centers, and volunteer spots near the centre. */
export async function fetchGooglePlaces(ctx: SearchContext): Promise<SourceResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new SourceSkipped("Add GOOGLE_PLACES_API_KEY to enable Google Places.");

  const kinds = kindsFor(ctx.vibes);
  const perKind = Math.min(10, Math.max(4, Math.floor(20 / kinds.length)));

  // Places API (New) is the default for new keys; older projects may only have the legacy API enabled.
  let search = searchNew;
  let results = await Promise.allSettled(kinds.map((k) => search(key, k, ctx, perKind)));
  const denied = results.every((r) => r.status === "rejected" && r.reason instanceof UpstreamError && r.reason.status === 403);
  if (denied) {
    search = searchLegacy;
    results = await Promise.allSettled(kinds.map((k) => search(key, k, ctx, perKind)));
  }
  if (results.every((r) => r.status === "rejected")) throw (results[0] as PromiseRejectedResult).reason;

  const seen = new Set<string>();
  const activities: Activity[] = [];
  const cities: string[] = [];
  results.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const kind = kinds[i];
    for (const place of result.value) {
      if (!fits(place, kind, ctx)) continue;
      // Big parks come back as several entrances or areas sharing one name.
      const nameKey = place.name.toLowerCase();
      if (seen.has(place.id) || seen.has(nameKey)) continue;
      seen.add(place.id);
      seen.add(nameKey);
      activities.push(toActivity(place, kind, ctx));
      if (place.city) cities.push(place.city);
    }
  });
  const failed = results.filter((r) => r.status === "rejected").length;
  return {
    activities,
    cities,
    note: failed ? `${failed} of ${kinds.length} place searches failed` : undefined,
  };
}
