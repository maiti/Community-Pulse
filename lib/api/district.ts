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
};

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
  // 00 is an at-large seat; 98 is a non-voting delegate (DC and the territories).
  if (raw === "00" || raw === "98") {
    return {
      code: `${abbr}-AL`,
      label: raw === "98" ? `${name} · Delegate District (at Large)` : `${name}'s At-Large Congressional District`,
      state: abbr,
    };
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return {
    code: `${abbr}-${String(n).padStart(2, "0")}`,
    label: `${name}'s ${ordinal(n)} Congressional District`,
    state: abbr,
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
