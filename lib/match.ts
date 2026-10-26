import { CATEGORIES, TIME_BUDGETS, TRAVEL_MODES } from "./categories";
import { travelMinutes } from "./geo";
import type { Activity, CategoryId, QuizPrefs } from "./types";

export const DEFAULT_PREFS: QuizPrefs = { vibes: [], modes: [], maxTravel: 30, time: null };

export type MatchResult = { score: number; total: number; perfect: boolean };

export function hasCriteria(prefs: QuizPrefs | null): prefs is QuizPrefs {
  return !!prefs && (prefs.vibes.length > 0 || prefs.modes.length > 0 || prefs.time !== null);
}

export function matchActivity(activity: Activity, prefs: QuizPrefs): MatchResult {
  let score = 0;
  let total = 0;

  if (prefs.vibes.length) {
    total++;
    if (prefs.vibes.some((v) => activity.vibeCategories.includes(v))) score++;
  }
  if (prefs.modes.length) {
    total++;
    const reachable = prefs.modes.some((mode) => {
      const minutes = travelMinutes(activity, mode);
      return minutes !== null && minutes <= prefs.maxTravel;
    });
    if (reachable) score++;
  }
  if (prefs.time) {
    total++;
    const [lo, hi] = TIME_BUDGETS[prefs.time].range;
    if (activity.durationRange.min <= hi && activity.durationRange.max >= lo) score++;
  }

  return { score, total, perfect: total > 0 && score === total };
}

export type WhenFilter = "any" | "today" | "weekend";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** An event's start in venue-local wall time. "Time TBA" listings ("Sat, Oct 24 · Time TBA") have a day but no time. */
function eventStart(activity: Activity, now: Date): { day: string; at: Date | null } | null {
  const iso = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}/.exec(activity.date);
  if (iso) return { day: iso[1], at: new Date(activity.date) };
  const tba = /\b([A-Z][a-z]{2}) (\d{1,2})\b/.exec(activity.date);
  const month = tba ? MONTHS.indexOf(tba[1]) : -1;
  if (!tba || month < 0) return null;
  const date = new Date(now.getFullYear(), month, Number(tba[2]));
  // No year in the label: a date well in the past means next year's.
  if (date.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) date.setFullYear(date.getFullYear() + 1);
  return { day: dayKey(date), at: null };
}

/**
 * Whether a listing fits the "Today" / "This weekend" filter. Only events are
 * filtered: drop-in spaces are there whenever you are. The weekend runs from
 * Friday 5 PM through Sunday.
 */
export function matchesWhen(activity: Activity, when: WhenFilter, now = new Date()) {
  if (when === "any" || activity.type !== "event") return true;
  const start = eventStart(activity, now);
  if (!start) return false;
  if (start.at && start.at.getTime() + activity.durationRange.max * 60_000 < now.getTime()) return false;
  if (when === "today") return start.day === dayKey(now);

  const dow = now.getDay();
  const day = (offset: number) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  const toFriday = dow === 0 ? -2 : 5 - dow;
  if (start.day === day(toFriday + 1) || start.day === day(toFriday + 2)) return true;
  return start.day === day(toFriday) && !!start.at && start.at.getHours() >= 17;
}

export type FeedItem = { activity: Activity; match: MatchResult | null };

export function buildFeed(
  activities: Activity[],
  opts: { category: CategoryId | "all"; query: string; prefs: QuizPrefs | null; when: WhenFilter },
): FeedItem[] {
  const q = opts.query.trim().toLowerCase();
  const now = new Date();

  const items = activities
    .filter((a) => matchesWhen(a, opts.when, now))
    .filter((a) => opts.category === "all" || a.category === opts.category || a.vibeCategories.includes(opts.category))
    .filter((a) => {
      if (!q) return true;
      const haystack = [
        a.title,
        a.organization,
        a.description,
        a.location.name,
        CATEGORIES[a.category].label,
        ...a.tags,
      ]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((word) => haystack.includes(word));
    })
    .map((activity) => ({ activity, match: opts.prefs ? matchActivity(activity, opts.prefs) : null }));

  if (!opts.prefs) {
    return items.sort((a, b) => a.activity.driveTimeMinutes - b.activity.driveTimeMinutes);
  }

  // Allow one missed criterion so the feed never collapses to a single card.
  // A search names what someone wants, so quiz picks only rank its results.
  return items
    .filter(({ match }) => q || (match && match.score >= Math.max(1, match.total - 1)))
    .sort(
      (a, b) =>
        (b.match?.score ?? 0) - (a.match?.score ?? 0) || a.activity.driveTimeMinutes - b.activity.driveTimeMinutes,
    );
}

export function describePrefs(prefs: QuizPrefs): string {
  const parts: string[] = [];
  if (prefs.vibes.length) {
    const names = prefs.vibes.map((v) => CATEGORIES[v].vibe);
    parts.push(names.length > 2 ? `${names.slice(0, 2).join(" / ")} +${names.length - 2}` : names.join(" / "));
  }
  if (prefs.modes.length) {
    const names = prefs.modes.map((m) => TRAVEL_MODES[m].short);
    parts.push(names.length > 2 ? `${names[0]} +${names.length - 1}` : names.join(" / "));
  }
  if (prefs.time) parts.push(TIME_BUDGETS[prefs.time].label);
  return parts.join(" + ");
}
