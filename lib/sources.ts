import type { ActivitySource } from "./types";

/** Attribution shown on cards. Google requires "Google Maps" next to Places data shown off its map. */
export const SOURCE_ATTRIBUTION: Record<ActivitySource, string> = {
  eventbrite: "via Eventbrite",
  ticketmaster: "via Ticketmaster",
  google: "Google Maps",
  curated: "Sample listing",
};
