import rawActivities from "@/data/activities.json";
import { localizeActivities } from "./geo";
import type { Activity, CategoryId, Coordinates } from "./types";

/** The bundled sample listings, authored around one San Francisco centroid. */
export const CURATED_ACTIVITIES: Activity[] = (rawActivities as Omit<Activity, "source">[]).map((a) => ({
  ...a,
  source: "curated",
}));

export const CURATED_BY_ID = new Map(CURATED_ACTIVITIES.map((a) => [a.id, a]));

/** Sample listings re-centered on `center`, keeping their real distances. */
export function curatedAround(center: Coordinates): Activity[] {
  return localizeActivities(CURATED_ACTIVITIES, center);
}

/** Verified Unsplash photos from the sample data, grouped by category. */
export const CATEGORY_IMAGES = CURATED_ACTIVITIES.reduce(
  (pool, a) => {
    if (!pool[a.category].includes(a.imageUrl)) pool[a.category].push(a.imageUrl);
    return pool;
  },
  { outdoors: [], volunteer: [], study: [], social: [], games: [], arts: [] } as Record<CategoryId, string[]>,
);
