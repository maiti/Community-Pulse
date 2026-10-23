export type CategoryId = "outdoors" | "volunteer" | "study" | "social" | "games" | "arts";

export type Coordinates = { lat: number; lng: number };

/** Where a listing came from. "curated" is the bundled sample data. */
export type ActivitySource = "eventbrite" | "ticketmaster" | "google" | "curated";
export type LiveSourceId = Exclude<ActivitySource, "curated">;

export type Activity = {
  id: string;
  source: ActivitySource;
  type: "event" | "space";
  /** Primary category: drives badge, pin, and CTA color. */
  category: CategoryId;
  title: string;
  organization: string;
  description: string;
  location: { name: string; address: string; coordinates: Coordinates };
  /** ISO datetime for events, human-readable hours for spaces. */
  date: string;
  activityDuration: string;
  /** Minutes someone would typically spend; spaces span a wide drop-in range. */
  durationRange: { min: number; max: number };
  transitInfo: {
    hasPublicTransit: boolean;
    estimatedTransitMinutes: number | null;
    transitNotes: string;
  };
  driveTimeMinutes: number;
  walkTimeMinutes: number;
  tags: string[];
  vibeCategories: CategoryId[];
  imageUrl: string;
  signupUrl: string;
};

export type LocationProfile = {
  id: string;
  /** Short badge, e.g. "CA-11" or "Ward 4". */
  code: string;
  /** City or municipality shown in headings. */
  name: string;
  /** Long-form label, e.g. "California's 11th Congressional District". */
  label: string;
  kind: "congressional" | "municipal" | "detected";
  centroid: Coordinates;
  /** Where travel estimates are measured from. */
  anchorLabel: string;
  edges: { north: string; south: string; east: string; west: string };
};

export type TravelMode = "walk" | "bike" | "transit" | "ride";
export type TimeBudget = "quick" | "medium" | "long";

export type QuizPrefs = {
  vibes: CategoryId[];
  modes: TravelMode[];
  maxTravel: number;
  time: TimeBudget | null;
};

export type SourceStatus = {
  id: LiveSourceId;
  label: string;
  /** skipped = not configured; error = request failed or was rate limited. */
  state: "ok" | "empty" | "skipped" | "error";
  count: number;
  note?: string;
};

/** Response body of GET /api/activities. */
export type FeedResponse = {
  activities: Activity[];
  sources: SourceStatus[];
  liveCount: number;
  /** True when curated sample listings were merged in to fill a thin feed. */
  usedFallback: boolean;
  /** Most common venue city in the live results, for detected locations. */
  areaLabel: string | null;
  center: Coordinates;
  /** Echo of the requested district code, if any. */
  district?: string | null;
  generatedAt: string;
};

export type AppView ="discover" | "map" | "activity" | "community" | "resources";
