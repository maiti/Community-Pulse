# Community-Pulse

CommunityPulse connects teens with local third spaces, community hubs, and volunteer opportunities to fight social isolation. It works in any congressional district or city: pick one from the region selector or use your device location.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 3, framer-motion, Radix-based shadcn/ui primitives, and mapbox-gl.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the keys you have
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

Every key is optional. The app works with none of them: it falls back to the illustrated map and the curated sample listings.

### Environment variables

| Variable | What it enables |
| --- | --- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox street tiles. Without it, or if it's rejected, the app draws its own illustrated map. |
| `TICKETMASTER_API_KEY` | Upcoming arts, music, family, and sports events from the [Ticketmaster Discovery API](https://developer.ticketmaster.com/). |
| `GOOGLE_PLACES_API_KEY` | Libraries, parks, cafés, bowling alleys, and community centers (Nearby Search), plus food banks, youth centers, and community gardens (Text Search) from Google Places. Enable **Places API (New)** for the key; the legacy Nearby Search is tried only if the new API is refused. |
| `EVENTBRITE_API_TOKEN` | Eventbrite events. |
| `EVENTBRITE_ORGANIZER_IDS` | Comma-separated Eventbrite organizer IDs to follow (the number at the end of an `eventbrite.com/o/…` URL). Eventbrite shut down public location search in 2020, so the app tries it and then reads these organizers' upcoming events, keeping the ones near the selected area. |

On Vercel, add the same variables under **Project → Settings → Environment Variables** (or `vercel env add <NAME>`), then redeploy.

## Live data

The browser calls `GET /api/activities?lat=…&lng=…&district=…&vibe=…&transport=…` whenever the location or the quiz picks change.

- **Fan-out:** the route queries Eventbrite, Ticketmaster, and Google Places in parallel with `Promise.allSettled`. A missing key, timeout (8 s), or rate limit only affects that one source, and the response reports each source's status.
- **One schema:** each adapter in `lib/api/` maps its results into the same `Activity` shape as the sample data. Travel times are estimated from straight-line distance. Photos come from Ticketmaster or Eventbrite when available, otherwise a category photo from Unsplash.
- **Quiz-aware:** `vibe` limits which kinds of places are searched, and `transport` sets the search radius (2.5 km walking up to 16 km by car).
- **Teen-safe:** events marked 18+ or 21+, cancelled shows, and upsell listings (VIP packages, parking) are dropped. Ticketmaster music, comedy, and uncategorized events are kept only when the listing says all ages (or a minimum age of 14 or under), because club shows are often 21+ without being flagged. Campus libraries are left out, since they usually need a student ID.
- **Volunteer spots:** Google has no place type for food banks, youth centers, or community gardens, so those come from Text Search, with a name check and a radius check on every hit.
- **Fallback:** fewer than 8 live listings tops the feed up with the curated samples, re-centered on the area. The "Live Feed for …" badge in the feed opens a breakdown of where listings came from.
- **Caching:** upstream calls use Next's data cache (15 minutes for events, 6 hours for places), and responses carry `s-maxage` so Vercel's CDN serves repeat requests. Coordinates are rounded to about 100 m so nearby users share cache entries.

Google Places requests are billed per call after Google's monthly free tier: one uncached area load makes up to 8 calls (5 Nearby Search, 3 Text Search), fewer when the quiz narrows the vibes. Ratings and opening hours put these calls in Google's Enterprise pricing tier, so set a daily quota in Google Cloud.

## Congressional district lookup

`GET /api/district?lat=…&lng=…` asks the free [US Census Geocoder](https://geocoding.geo.census.gov/geocoder/) which congressional district contains a point and returns `{ district: { code: "CA-11", label: "California's 11th Congressional District", state: "CA" } }`, or `{ district: null }` outside the US. "Use my current location" calls it, so the header shows your real district instead of "Near Me". No key is needed, and answers are cached for a week.

## How it fits together

| Path | What it holds |
| --- | --- |
| `app/api/activities/route.ts` | Unified live-data endpoint |
| `app/api/district/route.ts` | Congressional district for a point (`lib/api/district.ts` parses the Census response) |
| `lib/api/` | `eventbrite.ts`, `ticketmaster.ts`, `googlePlaces.ts` adapters, plus `feed.ts`, which merges them |
| `data/activities.json` | 20 curated sample listings (events and spaces) |
| `lib/use-live-activities.ts` | Client fetch with debounce, stale-while-refreshing, and offline fallback |
| `lib/location-state.tsx` | Region profiles (districts and cities) plus device-location detection |
| `lib/app-state.tsx` | Feed filters, quiz picks, saves, RSVPs, map selection |
| `lib/match.ts` | Search, category filtering, and quiz-based ranking |
| `components/` | Shell (`Sidebar`, `Header`), `DiscoveryFeed`, `ActivityCard`, `LiveBadge`, `MapView`, `QuizModal`, sheets and dialogs |
| `components/map/` | Mapbox renderer, illustrated fallback map, shared pin layer |
| `docs/DEMO_SCRIPT.md` | Shot list and narration for the Congressional App Challenge video |

Saved activities, RSVPs, quiz picks, and the chosen region are stored in `localStorage`, so they stay on the user's device. Saved and planned listings are kept as snapshots, so they stay in your list after the live feed moves on.

### Adding a new community

Add a profile to `LOCATION_PROFILES` in `lib/location-state.tsx`: code, name, centroid, and the neighborhoods that border it to the north, south, east, and west. Live sources pick it up automatically.
