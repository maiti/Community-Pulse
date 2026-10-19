"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import rawActivities from "@/data/activities.json";
import { localizeActivities } from "./geo";
import { useLocationState } from "./location-state";
import { buildFeed, hasCriteria, type FeedItem } from "./match";
import { createPersistentStore, usePersistentStore } from "./persistent-store";
import type { Activity, AppView, CategoryId, QuizPrefs } from "./types";

const TEMPLATE_ACTIVITIES = rawActivities as Activity[];

const savedStore = createPersistentStore<string[]>("cp:saved", []);
const plansStore = createPersistentStore<Record<string, string>>("cp:plans", {});
const prefsStore = createPersistentStore<QuizPrefs | null>("cp:prefs", null);
const prefsActiveStore = createPersistentStore<boolean>("cp:prefs-active", true);
const quizSeenStore = createPersistentStore<boolean>("cp:quiz-seen", false);

const noopSubscribe = () => () => {};

type AppState = {
  activities: Activity[];
  byId: Map<string, Activity>;
  feed: FeedItem[];

  category: CategoryId | "all";
  setCategory: (c: CategoryId | "all") => void;
  query: string;
  setQuery: (q: string) => void;

  prefs: QuizPrefs | null;
  setPrefs: (p: QuizPrefs | null) => void;
  prefsActive: boolean;
  setPrefsActive: (on: boolean) => void;
  /** Preferences currently shaping the feed (null when paused or empty). */
  appliedPrefs: QuizPrefs | null;

  saved: string[];
  toggleSaved: (id: string) => void;
  plans: Record<string, string>;
  togglePlan: (id: string) => void;

  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  view: AppView;
  setView: (v: AppView) => void;
  savedOpen: boolean;
  setSavedOpen: (open: boolean) => void;
  locationOpen: boolean;
  setLocationOpen: (open: boolean) => void;
  planTarget: Activity | null;
  setPlanTarget: (a: Activity | null) => void;

  quizOpen: boolean;
  openQuiz: () => void;
  closeQuiz: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { profile } = useLocationState();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [saved, setSaved] = usePersistentStore(savedStore);
  const [plans, setPlans] = usePersistentStore(plansStore);
  const [prefs, setPrefs] = usePersistentStore(prefsStore);
  const [prefsActive, setPrefsActive] = usePersistentStore(prefsActiveStore);
  const [quizSeen, setQuizSeen] = usePersistentStore(quizSeenStore);

  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("discover");
  const [savedOpen, setSavedOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState<Activity | null>(null);
  const [quizOverride, setQuizOverride] = useState<boolean | null>(null);

  const activities = useMemo(() => localizeActivities(TEMPLATE_ACTIVITIES, profile), [profile]);
  const byId = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);
  const appliedPrefs = prefsActive && hasCriteria(prefs) ? prefs : null;
  const feed = useMemo(
    () => buildFeed(activities, { category, query, prefs: appliedPrefs }),
    [activities, category, query, appliedPrefs],
  );

  const toggleSaved = useCallback(
    (id: string) => setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setSaved],
  );
  const togglePlan = useCallback(
    (id: string) =>
      setPlans((prev) => {
        const next = { ...prev };
        if (next[id]) delete next[id];
        else next[id] = new Date().toISOString();
        return next;
      }),
    [setPlans],
  );

  // First-time visitors see the quiz once the client knows they haven't taken it.
  const quizOpen = quizOverride ?? (hydrated && !quizSeen);
  const openQuiz = useCallback(() => {
    setPrefsActive(true);
    setQuizOverride(true);
  }, [setPrefsActive]);
  const closeQuiz = useCallback(() => {
    setQuizSeen(true);
    setQuizOverride(false);
  }, [setQuizSeen]);

  const value: AppState = {
    activities,
    byId,
    feed,
    category,
    setCategory,
    query,
    setQuery,
    prefs,
    setPrefs,
    prefsActive,
    setPrefsActive,
    appliedPrefs,
    saved,
    toggleSaved,
    plans,
    togglePlan,
    hoveredId,
    setHoveredId,
    selectedId,
    setSelectedId,
    view,
    setView,
    savedOpen,
    setSavedOpen,
    locationOpen,
    setLocationOpen,
    planTarget,
    setPlanTarget,
    quizOpen,
    openQuiz,
    closeQuiz,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}
