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

export type FeedItem = { activity: Activity; match: MatchResult | null };

export function buildFeed(
  activities: Activity[],
  opts: { category: CategoryId | "all"; query: string; prefs: QuizPrefs | null },
): FeedItem[] {
  const q = opts.query.trim().toLowerCase();

  const items = activities
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
  return items
    .filter(({ match }) => match && match.score >= Math.max(1, match.total - 1))
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
