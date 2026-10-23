import { NextResponse, type NextRequest } from "next/server";
import { loadFeed } from "@/lib/api/feed";
import type { CategoryId, TravelMode } from "@/lib/types";

const VIBES: CategoryId[] = ["outdoors", "volunteer", "study", "social", "games", "arts"];
const MODES: TravelMode[] = ["walk", "bike", "transit", "ride"];

function listParam<T extends string>(value: string | null, allowed: readonly T[]): T[] {
  if (!value) return [];
  return [...new Set(value.split(","))].filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/**
 * GET /api/activities?lat=37.765&lng=-122.435&district=CA-11&vibe=arts,social&transport=walk,transit
 *
 * Merges Eventbrite, Ticketmaster, Google Places and OpenStreetMap into the Activity schema,
 * topping up with curated samples when fewer than 8 live listings come back.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!params.has("lat") || !params.has("lng") || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "lat and lng are required numbers" }, { status: 400 });
  }

  const feed = await loadFeed({
    // ~100 m precision is plenty for a neighborhood search and keeps CDN cache keys shared.
    center: { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 },
    vibes: listParam(params.get("vibe"), VIBES),
    modes: listParam(params.get("transport"), MODES),
  });

  const healthy = feed.sources.every((s) => s.state !== "error");
  return NextResponse.json(
    { ...feed, district: params.get("district") },
    {
      headers: {
        // Cache good responses at the edge; retry soon after a source failed.
        "Cache-Control": healthy
          ? "public, s-maxage=900, stale-while-revalidate=3600"
          : "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
