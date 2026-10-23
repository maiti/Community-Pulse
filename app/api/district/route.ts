import { NextResponse, type NextRequest } from "next/server";
import { lookupDistrict } from "@/lib/api/district";

/**
 * GET /api/district?lat=37.765&lng=-122.435
 *
 * The congressional district containing a point, from the US Census Geocoder.
 * Returns { district: null } outside the US or when the Census can't place it.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!params.has("lat") || !params.has("lng") || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "lat and lng are required numbers" }, { status: 400 });
  }

  try {
    // ~100 m precision keeps CDN cache keys shared; district lines rarely sit that close.
    const district = await lookupDistrict({ lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 });
    return NextResponse.json({ district }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (err) {
    console.error("[district] lookup failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ district: null, error: "District lookup is unavailable" }, { status: 502 });
  }
}
