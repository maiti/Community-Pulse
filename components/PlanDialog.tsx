"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bus, CalendarCheck, CalendarPlus, Clock3, ExternalLink, MapPin, Navigation, Users } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { CATEGORIES } from "@/lib/categories";
import { directionsUrl } from "@/lib/geo";
import { useLocationState } from "@/lib/location-state";
import { SOURCE_ATTRIBUTION } from "@/lib/sources";
import type { ActivitySource } from "@/lib/types";
import { formatWhen } from "@/lib/utils";
import { ActivityThumb, CategoryBadge } from "./ActivityCard";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

const LINK_LABELS: Record<ActivitySource, string> = {
  eventbrite: "Register on Eventbrite",
  ticketmaster: "Get tickets on Ticketmaster",
  google: "View on Google Maps",
  curated: "Organizer page",
};

/** RSVP for events, "plan a visit" for drop-in spaces. Plans are kept on this device. */
export function PlanDialog() {
  const { planTarget, setPlanTarget, plans, togglePlan, appliedPrefs } = useAppState();
  const { profile } = useLocationState();
  // Keep showing the last activity while the dialog animates closed.
  const [activity, setActivity] = useState(planTarget);
  if (planTarget && planTarget !== activity) setActivity(planTarget);

  return (
    <Dialog open={!!planTarget} onOpenChange={(open) => !open && setPlanTarget(null)}>
      <DialogContent className="max-w-[460px] overflow-hidden p-0">
        {activity && (() => {
          const meta = CATEGORIES[activity.category];
          const when = formatWhen(activity.date);
          const planned = !!plans[activity.id];
          const isEvent = activity.type === "event";
          return (
            <>
              <div className="relative h-36">
                <ActivityThumb activity={activity} sizes="460px" className="absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
                <CategoryBadge activity={activity} className="absolute left-5 top-4" />
                <DialogTitle className="absolute inset-x-5 bottom-3 text-[20px] leading-6 text-white">{activity.title}</DialogTitle>
              </div>
              <div className="space-y-4 p-5">
                <DialogDescription>{activity.description}</DialogDescription>
                <dl className="grid grid-cols-2 gap-3 text-meta">
                  <div className="rounded-12 bg-canvas p-3">
                    <dt className="flex items-center gap-1 font-semibold text-ink-soft">
                      <Clock3 className="size-3.5" /> {isEvent ? "When" : "Hours"}
                    </dt>
                    <dd className="mt-1 font-semibold text-ink">
                      {when.day}
                      {when.time && ` · ${when.time}`}
                    </dd>
                    <dd className="text-ink-muted">{activity.activityDuration}</dd>
                  </div>
                  <div className="rounded-12 bg-canvas p-3">
                    <dt className="flex items-center gap-1 font-semibold text-ink-soft">
                      <MapPin className="size-3.5" /> Where
                    </dt>
                    <dd className="mt-1 font-semibold text-ink">{activity.location.name}</dd>
                    <dd className="text-ink-muted">
                      {activity.location.address} · {profile.name}
                    </dd>
                  </div>
                  <div className="col-span-2 flex items-start gap-2 rounded-12 bg-electric/[0.07] p-3 text-electric">
                    <Bus className="mt-px size-4 shrink-0" />
                    <p>
                      <span className="font-semibold">
                        {activity.transitInfo.hasPublicTransit
                          ? `~${activity.transitInfo.estimatedTransitMinutes} min by transit. `
                          : "Limited transit. "}
                      </span>
                      {activity.transitInfo.transitNotes}
                    </p>
                  </div>
                </dl>
                <p className="flex items-center gap-1.5 text-meta text-ink-muted">
                  <Users className="size-3.5 text-teal" />
                  {activity.source === "google" ? (
                    // Places have a type, not a host.
                    <span className="font-semibold text-ink">{activity.organization}</span>
                  ) : (
                    <>
                      Hosted by <span className="font-semibold text-ink">{activity.organization}</span>
                    </>
                  )}
                  <span className="text-ink-soft">· {SOURCE_ATTRIBUTION[activity.source]}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
                    <Button
                      className="w-full"
                      style={planned ? undefined : { background: meta.color, color: meta.onColor }}
                      variant={planned ? "outline" : "teal"}
                      onClick={() => togglePlan(activity.id)}
                    >
                      {planned ? <CalendarCheck /> : <CalendarPlus />}
                      {planned
                        ? isEvent
                          ? "You're going · Undo"
                          : "Visit planned · Undo"
                        : isEvent
                          ? "RSVP — I'm going"
                          : "Plan a visit"}
                    </Button>
                  </motion.div>
                  <Button variant="outline" asChild>
                    <a href={directionsUrl(activity, appliedPrefs?.modes[0] ?? "transit")} target="_blank" rel="noopener noreferrer">
                      <Navigation /> Directions
                    </a>
                  </Button>
                </div>
                <a
                  href={activity.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-meta font-semibold text-electric hover:underline"
                >
                  {LINK_LABELS[activity.source]} <ExternalLink className="size-3" />
                </a>
              </div>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
