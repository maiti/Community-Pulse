import type { ActivitySource } from "./types";

/** Attribution shown on cards. Google requires "Google Maps" next to Places data shown off its map. */
export const SOURCE_ATTRIBUTION: Record<ActivitySource, string> = {
  eventbrite: "via Eventbrite",
  ticketmaster: "via Ticketmaster",
  google: "Google Maps",
  // OpenStreetMap's license (ODbL) requires crediting its contributors.
  osm: "© OpenStreetMap contributors",
  curated: "Sample listing",
};

/** Sources that list places (which have a type, like "Library") rather than hosted events. */
export const isPlaceSource = (source: ActivitySource) => source === "google" || source === "osm";
