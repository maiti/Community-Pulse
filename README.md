# Community-Pulse

CommunityPulse connects teens with local third spaces, community hubs, and volunteer opportunities to fight social isolation. It works in any congressional district or city: pick one from the region selector or use your device location.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 3, framer-motion, Radix-based shadcn/ui primitives, and mapbox-gl.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

### Map tiles (optional)

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_MAPBOX_TOKEN` to a public Mapbox token to load street tiles. Without a token, or if the token is rejected, the app draws its own illustrated map with pan, zoom, clustering, and the same pins and popups.

## How it fits together

| Path | What it holds |
| --- | --- |
| `data/activities.json` | 20 sample listings (events and spaces) |
| `lib/location-state.tsx` | Region profiles (districts and cities) plus device-location detection |
| `lib/app-state.tsx` | Feed filters, quiz picks, saves, RSVPs, map selection |
| `lib/match.ts` | Search, category filtering, and quiz-based ranking |
| `components/` | Shell (`Sidebar`, `Header`), `DiscoveryFeed`, `ActivityCard`, `MapView`, `QuizModal`, sheets and dialogs |
| `components/map/` | Mapbox renderer, illustrated fallback map, shared pin layer |

Saved activities, RSVPs, quiz picks, and the chosen region are stored in `localStorage`, so they stay on the user's device.

### Adding a new community

1. Add a profile to `LOCATION_PROFILES` in `lib/location-state.tsx`: code, name, centroid, and the neighborhoods that border it to the north, south, east, and west.
2. Replace `data/activities.json` with real local listings using the same schema.

Until real listings are loaded, the sample data is re-centered on whichever region is selected. Distances are kept the same, so travel times still hold, and the feed shows a "Sample listings" note.
