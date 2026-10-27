import type { Coordinates } from "../types";
import { fetchJson } from "./shared";

const ENDPOINT = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates";

/** State FIPS code → [USPS abbreviation, name]. */
const STATES: Record<string, [string, string]> = {
  "01": ["AL", "Alabama"], "02": ["AK", "Alaska"], "04": ["AZ", "Arizona"], "05": ["AR", "Arkansas"],
  "06": ["CA", "California"], "08": ["CO", "Colorado"], "09": ["CT", "Connecticut"], "10": ["DE", "Delaware"],
  "11": ["DC", "District of Columbia"], "12": ["FL", "Florida"], "13": ["GA", "Georgia"], "15": ["HI", "Hawaii"],
  "16": ["ID", "Idaho"], "17": ["IL", "Illinois"], "18": ["IN", "Indiana"], "19": ["IA", "Iowa"],
  "20": ["KS", "Kansas"], "21": ["KY", "Kentucky"], "22": ["LA", "Louisiana"], "23": ["ME", "Maine"],
  "24": ["MD", "Maryland"], "25": ["MA", "Massachusetts"], "26": ["MI", "Michigan"], "27": ["MN", "Minnesota"],
  "28": ["MS", "Mississippi"], "29": ["MO", "Missouri"], "30": ["MT", "Montana"], "31": ["NE", "Nebraska"],
  "32": ["NV", "Nevada"], "33": ["NH", "New Hampshire"], "34": ["NJ", "New Jersey"], "35": ["NM", "New Mexico"],
  "36": ["NY", "New York"], "37": ["NC", "North Carolina"], "38": ["ND", "North Dakota"], "39": ["OH", "Ohio"],
  "40": ["OK", "Oklahoma"], "41": ["OR", "Oregon"], "42": ["PA", "Pennsylvania"], "44": ["RI", "Rhode Island"],
  "45": ["SC", "South Carolina"], "46": ["SD", "South Dakota"], "47": ["TN", "Tennessee"], "48": ["TX", "Texas"],
  "49": ["UT", "Utah"], "50": ["VT", "Vermont"], "51": ["VA", "Virginia"], "53": ["WA", "Washington"],
  "54": ["WV", "West Virginia"], "55": ["WI", "Wisconsin"], "56": ["WY", "Wyoming"], "60": ["AS", "American Samoa"],
  "66": ["GU", "Guam"], "69": ["MP", "Northern Mariana Islands"], "72": ["PR", "Puerto Rico"], "78": ["VI", "U.S. Virgin Islands"],
};

export type District = {
  /** e.g. "CA-11", or "WY-AL" for an at-large seat. */
  code: string;
  /** e.g. "California's 11th Congressional District". */
  label: string;
  state: string;
  /** The exact city or town at the point ("Orinda", not the nearest big city), when the Census knows it. */
  city?: string;
};

/**
 * The incorporated city or town at the point, falling back to a Census
 * Designated Place for unincorporated communities.
 */
function parseCity(layers: Record<string, CensusGeo[] | undefined>): string | undefined {
  for (const pattern of [/incorporated places/i, /census designated places/i]) {
    const name = Object.keys(layers).find((k) => pattern.test(k));
    const place = name ? layers[name]?.[0]?.BASENAME : undefined;
    if (place) return place;
  }
  return undefined;
}

type CensusGeo = Record<string, string | undefined>;
type CensusResponse = { result?: { geographies?: Record<string, CensusGeo[] | undefined> } };

function ordinal(n: number) {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/**
 * Reads the congressional district from a Census Geocoder response. The layer
 * is named after the current Congress ("119th Congressional Districts"), so it
 * is matched by pattern, and the district number field (CD119) likewise.
 */
export function parseDistrict(data: CensusResponse): District | null {
  const layers = data.result?.geographies ?? {};
  const layerName = Object.keys(layers)
    .filter((k) => /congressional districts/i.test(k))
    .sort()
    .at(-1);
  const geo = layerName ? layers[layerName]?.[0] : undefined;
  if (!geo) return null;

  const fips = geo.STATE ?? geo.GEOID?.slice(0, 2);
  const state = fips ? STATES[fips] : undefined;
  const cdKey = Object.keys(geo).find((k) => /^CD\d+$/.test(k));
  const raw = (cdKey && geo[cdKey]) ?? geo.GEOID?.slice(2);
  if (!state || !raw || raw === "ZZ") return null;

  const [abbr, name] = state;
  const city = parseCity(layers);
  // 00 is an at-large seat; 98 is a non-voting delegate (DC and the territories).
  if (raw === "00" || raw === "98") {
    return {
      code: `${abbr}-AL`,
      label: raw === "98" ? `${name} · Delegate District (at Large)` : `${name}'s At-Large Congressional District`,
      state: abbr,
      city,
    };
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return {
    code: `${abbr}-${String(n).padStart(2, "0")}`,
    label: `${name}'s ${ordinal(n)} Congressional District`,
    state: abbr,
    city,
  };
}

/** Looks up the congressional district containing a point (US only). Free, no key. */
export async function lookupDistrict({ lat, lng }: Coordinates): Promise<District | null> {
  const params = new URLSearchParams({
    x: String(lng),
    y: String(lat),
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    layers: "all",
    format: "json",
  });
  // District lines only move after redistricting, so cache for a week.
  const data = await fetchJson<CensusResponse>("Census Geocoder", `${ENDPOINT}?${params}`, { revalidate: 7 * 24 * 60 * 60 });
  return parseDistrict(data);
}

const TIGERWEB = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer";
const WEEK = 7 * 24 * 60 * 60;

/** [lng, lat] rings: the first ring of each polygon is its outline, any others are holes. */
export type DistrictGeometry = { type: "MultiPolygon"; coordinates: [number, number][][][] };

type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: [number, number][][] }
  | { type: "MultiPolygon"; coordinates: [number, number][][][] };
type FeatureCollection = { features?: { geometry?: GeoJsonGeometry | null }[] };
type ServiceInfo = { layers?: { id: number; name: string }[] };

/** "CA-11" → SQL filter for that district in TIGERweb; null for codes that aren't congressional. */
export function boundaryFilter(code: string): string | null {
  const match = /^([A-Z]{2})-(\d{2}|AL)$/.exec(code);
  const fips = match && Object.keys(STATES).find((k) => STATES[k][0] === match[1]);
  if (!match || !fips) return null;
  // At-large seats (00, or 98 for delegates) are the only district in their state.
  return match[2] === "AL" ? `STATE='${fips}'` : `GEOID='${fips}${match[2]}'`;
}

/**
 * The layer id changes when a new Congress is seated, so find it by name
 * ("119th Congressional Districts") rather than hardcoding it.
 */
async function congressLayerId() {
  const info = await fetchJson<ServiceInfo>("Census TIGERweb", `${TIGERWEB}?f=json`, { revalidate: WEEK });
  const layer = (info.layers ?? [])
    .map((l) => ({ id: l.id, congress: Number(/^(\d+)(?:st|nd|rd|th) Congressional Districts$/i.exec(l.name.trim())?.[1]) }))
    .filter((l) => Number.isFinite(l.congress))
    .sort((a, b) => b.congress - a.congress)[0];
  if (!layer) throw new Error("Census TIGERweb: no congressional district layer");
  return layer.id;
}

/** The outline of a congressional district from Census TIGERweb (free, no key), or null if unknown. */
export async function fetchDistrictBoundary(code: string): Promise<DistrictGeometry | null> {
  const where = boundaryFilter(code);
  if (!where) return null;
  const params = new URLSearchParams({
    where,
    outFields: "GEOID",
    returnGeometry: "true",
    outSR: "4326",
    // Simplify to ~50 m and 5 decimals: plenty for an outline, and keeps big districts small.
    maxAllowableOffset: "0.0005",
    geometryPrecision: "5",
    f: "geojson",
  });
  const layer = await congressLayerId();
  const data = await fetchJson<FeatureCollection>("Census TIGERweb", `${TIGERWEB}/${layer}/query?${params}`, {
    revalidate: WEEK,
  });
  const coordinates = (data.features ?? []).flatMap(({ geometry }) =>
    geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [],
  );
  return coordinates.length ? { type: "MultiPolygon", coordinates } : null;
}
