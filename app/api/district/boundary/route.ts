import { NextResponse, type NextRequest } from "next/server";
import { boundaryFilter, fetchDistrictBoundary } from "@/lib/api/district";

/**
 * GET /api/district/boundary?code=CA-11
 *
 * The district's outline as a GeoJSON MultiPolygon, from Census TIGERweb.
 * Returns { geometry: null } when the Census has no shape for the code.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.toUpperCase() ?? "";
  if (!boundaryFilter(code)) {
    return NextResponse.json({ error: "code must be a congressional district like CA-11 or WY-AL" }, { status: 400 });
  }

  try {
    const geometry = await fetchDistrictBoundary(code);
    return NextResponse.json(
      { code, geometry },
      { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000" } },
    );
  } catch (err) {
    console.error("[district boundary] lookup failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ code, geometry: null, error: "District boundaries are unavailable" }, { status: 502 });
  }
}
