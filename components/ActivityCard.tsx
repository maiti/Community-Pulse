"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Bus, Car, Check, Clock3, Footprints, Heart, Navigation, Sparkles } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { directionsUrl } from "@/lib/geo";
import type { MatchResult } from "@/lib/match";
import type { Activity, TravelMode } from "@/lib/types";
import { cn, formatWhen } from "@/lib/utils";

type Props = {
  activity: Activity;
  match: MatchResult | null;
  highlighted: boolean;
  selected: boolean;
  saved: boolean;
  planned: boolean;
  anchorLabel: string;
  preferredMode: TravelMode;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onToggleSave: (id: string) => void;
  onPlan: (activity: Activity) => void;
};

export function ActivityThumb({ activity, className, sizes }: { activity: Activity; className?: string; sizes: string }) {
  const [failed, setFailed] = useState(false);
  const meta = CATEGORIES[activity.category];
  const Icon = meta.icon;
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: meta.pastel }}>
      {failed ? (
        <div className="grid size-full place-items-center bg-topo-navy bg-topo">
          <Icon className="size-8" style={{ color: meta.color }} strokeWidth={1.5} />
        </div>
      ) : (
        <Image
          src={activity.imageUrl}
          alt=""
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-500 group-hover/card:scale-[1.06]"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function CategoryBadge({ activity, className }: { activity: Activity; className?: string }) {
  const meta = CATEGORIES[activity.category];
  const Icon = meta.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-micro font-semibold", className)}
      style={{ background: meta.color, color: meta.onColor }}
    >
      <Icon className="size-3" strokeWidth={2.25} />
      {meta.label}
      <span className="opacity-70">· {activity.type === "event" ? "Event" : "Space"}</span>
    </span>
  );
}

function TravelCell({
  icon: Icon,
  minutes,
  label,
  emphasis,
}: {
  icon: typeof Car;
  minutes: number | null;
  label: string;
  emphasis?: boolean;
}) {
  const unavailable = minutes === null;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-12 py-1.5",
        emphasis ? "bg-electric/10 text-electric" : "text-ink-muted",
        unavailable && "opacity-50",
      )}
      title={unavailable ? `No direct ${label.toLowerCase()} route` : `${minutes} min by ${label.toLowerCase()}`}
    >
      <Icon className="size-4" strokeWidth={2} />
      <span className={cn("text-meta font-bold", emphasis ? "text-electric" : "text-ink")}>
        {unavailable ? "—" : `${minutes}m`}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function ActivityCardImpl({
  activity,
  match,
  highlighted,
  selected,
  saved,
  planned,
  anchorLabel,
  preferredMode,
  onHover,
  onSelect,
  onToggleSave,
  onPlan,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const meta = CATEGORIES[activity.category];
  const when = formatWhen(activity.date);
  const transit = activity.transitInfo;

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  const ctaLabel = activity.type === "event" ? (planned ? "Going" : "RSVP") : planned ? "Planned" : "Visit";

  return (
    <motion.article
      ref={ref}
      onMouseEnter={() => onHover(activity.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(activity.id)}
      onClick={() => onSelect(activity.id)}
      whileHover={{ y: -3, scale: 1.008 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      className={cn(
        "group/card relative cursor-pointer rounded-14 border bg-white p-2.5 transition-[box-shadow,border-color] duration-200 @container",
        highlighted || selected
          ? "border-teal/50 shadow-lift ring-2 ring-teal/25"
          : "border-line shadow-card hover:shadow-lift",
      )}
      aria-label={activity.title}
    >
      {/* Category-colored edge accent */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-5 h-[calc(100%-40px)] w-[3px] rounded-r-full transition-opacity",
          highlighted || selected ? "opacity-100" : "opacity-0",
        )}
        style={{ background: meta.color }}
      />

      <div className="flex flex-col gap-3 @[620px]:min-h-[135px] @[620px]:flex-row @[620px]:gap-4">
        <div className="flex gap-3 @[620px]:contents">
          <ActivityThumb
            activity={activity}
            sizes="138px"
            className="size-[92px] shrink-0 rounded-12 @[620px]:h-[135px] @[620px]:w-[138px]"
          />

          {/* Details */}
          <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryBadge activity={activity} />
              {match?.perfect && (
                <span className="inline-flex items-center gap-1 rounded-full bg-pastel-butter px-2 py-[3px] text-micro font-semibold text-[#9a5f00]">
                  <Sparkles className="size-3" /> Great match
                </span>
              )}
            </div>
            <h3 className="line-clamp-1 text-[15px] font-bold leading-5 text-ink">{activity.title}</h3>
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-ink-muted">
              <span className="truncate">by {activity.organization}</span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-ink">
                <Clock3 className="size-3.5 text-teal" />
                {activity.activityDuration}
              </span>
              <span className="whitespace-nowrap">
                {when.day}
                {when.time && ` · ${when.time}`}
              </span>
            </p>
            <p className="hidden text-meta leading-[17px] text-ink-muted @[420px]:line-clamp-2">
              {activity.description}
            </p>
            <ul className="mt-auto flex flex-wrap gap-1 pt-0.5">
              {activity.tags.slice(0, 3).map((tag) => (
                <li key={tag} className="rounded-full border border-line bg-canvas px-2 py-0.5 text-micro font-medium text-ink-muted">
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Travel + actions */}
        <div className="flex shrink-0 flex-col gap-2 @[620px]:w-[220px] @[620px]:border-l @[620px]:border-line @[620px]:pl-4">
          <div>
            <div className="grid grid-cols-3 gap-1">
              <TravelCell icon={Car} minutes={activity.driveTimeMinutes} label="Car" />
              <TravelCell
                icon={Bus}
                minutes={transit.hasPublicTransit ? transit.estimatedTransitMinutes : null}
                label="Transit"
                emphasis={transit.hasPublicTransit}
              />
              <TravelCell icon={Footprints} minutes={activity.walkTimeMinutes} label="Walking" />
            </div>
            <p className="mt-1 truncate text-center text-[10.5px] text-ink-soft" title={transit.transitNotes}>
              from {anchorLabel}
            </p>
          </div>

          <div className="mt-auto flex items-center gap-1.5">
            <a
              href={directionsUrl(activity, preferredMode)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-12 border border-line bg-white px-2 text-meta font-semibold text-ink transition hover:border-[#cfd8e3] hover:bg-canvas"
            >
              <Navigation className="size-3.5" />
              Get Directions
            </a>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(activity.id);
              }}
              aria-pressed={saved}
              aria-label={saved ? `Remove ${activity.title} from saved` : `Save ${activity.title}`}
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-12 border transition-colors",
                saved ? "border-coral/30 bg-coral/10 text-coral" : "border-line bg-white text-ink-muted hover:text-coral",
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={saved ? "on" : "off"}
                  initial={{ scale: 0.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 600, damping: 14 }}
                >
                  <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlan(activity);
            }}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-12 text-meta font-bold transition hover:brightness-95 active:scale-[0.98]"
            style={{ background: meta.color, color: meta.onColor, boxShadow: `0 6px 14px -8px ${meta.color}` }}
          >
            {planned && <Check className="size-3.5" />}
            {ctaLabel}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export const ActivityCard = memo(ActivityCardImpl);
