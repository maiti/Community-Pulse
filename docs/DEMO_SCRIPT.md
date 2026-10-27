# CommunityPulse: demo video script

Target length: **2:45**. The Congressional App Challenge requires a public YouTube or Vimeo video of 1 to 3 minutes, and judges can penalize anything longer. The video has to introduce each student, name the app, explain its purpose and audience, list the tools and languages, and show it working. Check your district's own rules page for the exact deadline and wording.

## Before you record

- [ ] Deployed site loads, with `TICKETMASTER_API_KEY` and `GOOGLE_PLACES_API_KEY` set and the site redeployed after adding them.
- [ ] Open `/api/activities?lat=…&lng=…` for your own district. `sources` shows `ok` for Ticketmaster and Google, and `usedFallback` is `false`.
- [ ] Open `/api/district?lat=…&lng=…` with your coordinates. It returns your district code, such as `CA-10`, and your exact city, such as `Orinda` (not the nearest big city).
- [ ] The **Live Feed** badge's breakdown only lists sources that returned listings, so nothing reads "not set up" on camera.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is set if you want street tiles; the illustrated map also looks good on camera.
- [ ] Record in a **fresh browser profile or incognito window** so the quiz shows on first load and no old saves appear.
- [ ] Browser zoom at 110 to 125 percent so text is readable in the video. Window around 1440 × 900. Hide bookmarks and other tabs.
- [ ] Allow location for the site ahead of time so the permission popup doesn't interrupt the take.
- [ ] Rehearse the clicks once without recording. Live data changes, so pick the listings you'll click on the day you record.

## Script

| Time | On screen | Say |
| --- | --- | --- |
| 0:00 – 0:15 | Your faces, or the app's landing screen with names as captions | "Hi, we're **[name]** and **[name]**, from **[school]** in **[district]**. This is CommunityPulse." |
| 0:15 – 0:40 | Landing screen, slow scroll | "The U.S. Surgeon General has called loneliness an epidemic, and teens are hit hard. Lots of us go from school to home to a screen. There are places to go, like libraries, parks, youth centers, and food banks that need volunteers, but they're scattered across a dozen websites. CommunityPulse puts them in one feed, close to home." |
| 0:40 – 1:05 | The quiz: pick two vibes (for example, Volunteer and Social), walking and transit, and a time budget | "When you first open it, a short quiz asks what you're into, how you get around, and how much time you have. No account and no personal info: everything stays on your device." |
| 1:05 – 1:35 | Feed results. Click the **Live Feed** badge to show where listings come from. Click the **Volunteer** filter and show a food bank or youth center. | "The feed is live. Our server pulls real places from Google and all-ages events from Ticketmaster, then ranks them by your answers and how long it takes to get there by bus, bike, or on foot. We filter out 21+ shows and campus libraries, because this is built for teens." |
| 1:35 – 1:55 | Switch to **Map**. Click a pin, then the popup | "Everything is on a map too, so you can see what's actually nearby. Every listing links straight to directions." |
| 1:55 – 2:15 | Click **Visit** or **RSVP** on a card, confirm in the dialog, then open **My Activity** | "When something looks good, you can plan a visit or RSVP, and it shows up in My Activity, so going out becomes a plan instead of a maybe." |
| 2:15 – 2:30 | **Change Region**, then **Use my current location**. The header changes to your real district code, and the badge reads **Live Feed for** your exact town (for example, Orinda) | "It works anywhere in the country. Tap 'use my location' and the U.S. Census Bureau's geocoder tells us your exact town and which congressional district you're in, so a student in any district gets their own local feed." |
| 2:30 – 2:45 | A slide or text overlay listing the stack | "We built it with **TypeScript**, **React**, and **Next.js**, styled with **Tailwind CSS**. The map is **Mapbox**, and the data comes from the **Google Places**, **Ticketmaster**, and **U.S. Census** APIs, all deployed on **Vercel**." |
| 2:45 | Logo | "CommunityPulse: find your people, close to home. Thanks for watching." |

## Recording tips

- Record the screen and voice separately if you can, then line them up: it's easier to re-take a stumble.
- Keep the mouse slow and deliberate; pause half a second on anything you want judges to read.
- If a live source is slow on the day, a quick refresh usually helps, because responses are cached for 15 minutes once loaded.
- Upload as **Public** (not Unlisted or Private) on YouTube or Vimeo, and open the link in a logged-out window to confirm it plays.

## Likely judge questions

- **Is it really live?** Yes. Show `/api/activities` for your district and point at `sources`.
- **How do you keep it safe for teens?** Adult-only and club events are filtered out, there are no accounts or messaging, and nothing about the user leaves their device except the area they're searching.
- **What's next?** Following local organizations on Eventbrite, an approval queue so organizations can submit their own teen programs, and drawing district boundaries on the map.
