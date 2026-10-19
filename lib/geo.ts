import type { Activity, Coordinates, LocationProfile, TravelMode } from "./types";

const KM_PER_DEG_LAT = 110.574;
const kmPerDegLng = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);

export function haversineKm(a: Coordinates, b: Coordinates) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function centroidOf(points: Coordinates[]): Coordinates {
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/** Offset of `p` from `origin`, in kilometres (east, north). */
export function offsetKm(origin: Coordinates, p: Coordinates) {
  return {
    east: (p.lng - origin.lng) * kmPerDegLng(origin.lat),
    north: (p.lat - origin.lat) * KM_PER_DEG_LAT,
  };
}

export function addKm(origin: Coordinates, east: number, north: number): Coordinates {
  return { lat: origin.lat + north / KM_PER_DEG_LAT, lng: origin.lng + east / kmPerDegLng(origin.lat) };
}

/**
 * The bundled dataset is a template authored around one centroid. Re-centering
 * keeps every listing's real-world distance (so travel times stay truthful)
 * while placing it inside whichever district is selected.
 */
export function localizeActivities(activities: Activity[], profile: LocationProfile): Activity[] {
  const origin = centroidOf(activities.map((a) => a.location.coordinates));
  return activities.map((a) => {
    const { east, north } = offsetKm(origin, a.location.coordinates);
    return {
      ...a,
      location: { ...a.location, coordinates: addKm(profile.centroid, east, north) },
    };
  });
}

export type Bounds = { west: number; south: number; east: number; north: number };

export function boundsOf(points: Coordinates[]): Bounds {
  return points.reduce(
    (b, p) => ({
      west: Math.min(b.west, p.lng),
      east: Math.max(b.east, p.lng),
      south: Math.min(b.south, p.lat),
      north: Math.max(b.north, p.lat),
    }),
    { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity },
  );
}

export function travelMinutes(activity: Activity, mode: TravelMode): number | null {
  switch (mode) {
    case "walk":
      return activity.walkTimeMinutes;
    case "bike":
      return Math.max(3, Math.round(activity.walkTimeMinutes / 3.2) + 2);
    case "transit":
      return activity.transitInfo.hasPublicTransit ? activity.transitInfo.estimatedTransitMinutes : null;
    case "ride":
      return activity.driveTimeMinutes;
  }
}

export function directionsUrl(activity: Activity, mode: TravelMode = "transit") {
  const { lat, lng } = activity.location.coordinates;
  const travelmode = { walk: "walking", bike: "bicycling", transit: "transit", ride: "driving" }[mode];
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(5)},${lng.toFixed(5)}&travelmode=${travelmode}`;
}
