import { CATEGORIES } from "./categories";
import { CATEGORY_IMAGES } from "./curated";
import type { Activity } from "./types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Credit Mapbox requires somewhere on the page, since the snapshots hide their own. */
export const STATIC_MAP_ATTRIBUTION = "Place thumbnails © Mapbox © OpenStreetMap";

/** Live listings with no photo of their own get a shared category photo from the sample data. */
function usesStockPhoto(activity: Activity) {
  return activity.source !== "curated" && CATEGORY_IMAGES[activity.category].includes(activity.imageUrl);
}

/**
 * A Mapbox Static Images snapshot of the listing's street corner, with a pin
 * in its category color, so places don't all share the same few stock photos.
 * Null without a Mapbox token or when the listing has a real photo.
 */
export function staticMapUrl(activity: Activity): string | null {
  if (!MAPBOX_TOKEN || !usesStockPhoto(activity)) return null;
  const { lat, lng } = activity.location.coordinates;
  const at = `${lng.toFixed(5)},${lat.toFixed(5)}`;
  const pin = `pin-s+${CATEGORIES[activity.category].color.slice(1).toLowerCase()}(${at})`;
  // One size for every slot (cards, popup, plan dialog), so the browser fetches each place once.
  return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${pin}/${at},15,0/320x240@2x?attribution=false&logo=false&access_token=${MAPBOX_TOKEN}`;
}
