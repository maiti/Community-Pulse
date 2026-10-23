import { estimateTravel } from "../geo";
import type { Activity, CategoryId, Coordinates } from "../types";
import { clip, fetchJson, joinAddress, pickImage, type SearchContext, type SourceResult } from "./shared";

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const MAX_RADIUS_KM = 6;
const PER_KIND = 6;
// Mapped places change slowly, and the public Overpass server asks for light use.
const REVALIDATE = 24 * 60 * 60;

type OsmKind = "library" | "community_center" | "youth_center" | "skate_park" | "community_garden" | "park";

/**
 * Free, keyless places from OpenStreetMap. Every kind needs a name, and
 * anything tagged private or customers-only is skipped.
 */
const KINDS: Record<
  OsmKind,
  { filter: string; category: CategoryId; vibes: CategoryId[]; label: string; range: [number, number]; blurb: string }
> = {
  library: {
    filter: '["amenity"="library"]',
    category: "study",
    vibes: ["study"],
    label: "Library",
    range: [30, 240],
    blurb: "A free, quiet place to study, read, or work on projects. Many branches run teen programs, so ask at the desk.",
  },
  youth_center: {
    filter: '["amenity"="community_centre"]["community_centre"="youth_centre"]',
    category: "social",
    vibes: ["social", "games", "volunteer"],
    label: "Youth center",
    range: [60, 180],
    blurb: "A drop-in space built for teens: homework help, games, and programs run by staff and other young people.",
  },
  community_center: {
    filter: '["amenity"="community_centre"]',
    category: "social",
    vibes: ["social", "volunteer"],
    label: "Community center",
    range: [30, 180],
    blurb: "A neighborhood hub for drop-in programs, classes, and volunteer projects. Check the front desk for teen hours.",
  },
  skate_park: {
    filter: '["sport"="skateboard"]',
    category: "outdoors",
    vibes: ["outdoors", "games", "social"],
    label: "Skate park",
    range: [30, 150],
    blurb: "Bowls, rails, and ledges for skating, scooters, and BMX. Bring a helmet; locals are usually happy to share tips.",
  },
  community_garden: {
    filter: '["leisure"="garden"]["garden:type"="community"]',
    category: "volunteer",
    vibes: ["volunteer", "outdoors"],
    label: "Community garden",
    range: [60, 180],
    blurb: "Neighbors grow food together here. Workdays welcome volunteers, and no gardening experience is needed.",
  },
  park: {
    filter: '["leisure"="park"]',
    category: "outdoors",
    vibes: ["outdoors", "social"],
    label: "Park",
    range: [30, 180],
    blurb: "Open green space to walk, play pickup games, or meet friends outside. No ticket, no reservation.",
  },
};
const ALL_KINDS = Object.keys(KINDS) as OsmKind[];

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Which kind an element is, checked most specific first (a park can also be a skate spot). */
export function kindOf(tags: Record<string, string>): OsmKind | null {
  if (tags.amenity === "library") return "library";
  if (tags.amenity === "community_centre") return tags.community_centre === "youth_centre" ? "youth_center" : "community_center";
  if (tags.sport === "skateboard") return "skate_park";
  if (tags.leisure === "garden" && tags["garden:type"] === "community") return "community_garden";
  if (tags.leisure === "park") return "park";
  return null;
}

function kindsFor(vibes: CategoryId[]): OsmKind[] {
  if (!vibes.length) return ALL_KINDS;
  const matched = ALL_KINDS.filter((k) => vibes.some((v) => KINDS[k].vibes.includes(v)));
  return matched.length ? matched : ALL_KINDS;
}

/** One Overpass query with a separate result cap per kind, so parks can't crowd out libraries. */
export function buildQuery(kinds: OsmKind[], center: Coordinates, radiusM: number) {
  const around = `(around:${Math.round(radiusM)},${center.lat},${center.lng})`;
  const statements = kinds.map(
    (k) => `nwr${KINDS[k].filter}["name"]["access"!~"^(private|no|customers)$"]${around}->.${k};.${k} out center ${PER_KIND};`,
  );
  return `[out:json][timeout:7];${statements.join("")}`;
}

/** OSM's `opening_hours` syntax is readable when short ("Mo-Fr 09:00-18:00"); long rules aren't. */
function hoursLabel(raw: string | undefined) {
  if (!raw) return "Hours vary";
  if (raw === "24/7") return "Open 24 hours";
  return raw.length <= 32 ? raw.replace(/;\s*/g, " · ") : "Check hours";
}

export function toActivity(el: OsmElement, ctx: SearchContext): Activity | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  const kind = kindOf(tags);
  if (!name || lat == null || lng == null || !kind) return null;

  const meta = KINDS[kind];
  const coordinates = { lat, lng };
  const id = `osm-${el.type}-${el.id}`;
  const free = tags.fee !== "yes";
  const website = tags.website ?? tags["contact:website"];
  return {
    id,
    source: "osm",
    type: "space",
    category: meta.category,
    title: name,
    organization: meta.label,
    description: tags.description ? clip(tags.description) : meta.blurb,
    location: {
      name,
      address: joinAddress([tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "), tags["addr:city"]),
      coordinates,
    },
    date: hoursLabel(tags.opening_hours),
    activityDuration: "Drop in",
    durationRange: { min: meta.range[0], max: meta.range[1] },
    ...estimateTravel(ctx.center, coordinates),
    tags: [meta.label, free ? "Free entry" : null, tags.wheelchair === "yes" ? "Wheelchair accessible" : null].filter(
      (t): t is string => !!t,
    ),
    vibeCategories: meta.vibes,
    imageUrl: pickImage(undefined, meta.category, id),
    signupUrl: website?.startsWith("http")
      ? website
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lng}`)}`,
  };
}

/** Libraries, youth and community centers, skate parks, community gardens and parks from OpenStreetMap. */
export async function fetchOpenStreetMap(ctx: SearchContext): Promise<SourceResult> {
  const query = buildQuery(kindsFor(ctx.vibes), ctx.center, Math.min(ctx.radiusKm, MAX_RADIUS_KM) * 1000);
  const data = await fetchJson<{ elements?: OsmElement[] }>("OpenStreetMap", ENDPOINT, {
    method: "POST",
    revalidate: REVALIDATE,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Overpass asks clients to identify themselves.
      "User-Agent": "CommunityPulse/1.0 (teen community discovery app)",
    },
    body: new URLSearchParams({ data: query }).toString(),
  });

  const seen = new Set<string>();
  const activities: Activity[] = [];
  const cities: string[] = [];
  for (const el of data.elements ?? []) {
    const activity = toActivity(el, ctx);
    if (!activity) continue;
    // Parks and gardens are often mapped as several areas sharing one name.
    const nameKey = activity.title.toLowerCase();
    if (seen.has(nameKey)) continue;
    seen.add(nameKey);
    activities.push(activity);
    if (el.tags?.["addr:city"]) cities.push(el.tags["addr:city"]);
  }
  return { activities, cities };
}
