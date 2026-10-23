"use client";

import { AnimatePresence } from "framer-motion";
import { CalendarCheck, Heart, Pencil, Sparkles } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { describePrefs, hasCriteria } from "@/lib/match";
import type { Activity } from "@/lib/types";
import { SavedItem } from "../SavedSheet";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ViewHeader } from "./ViewHeader";

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-14 border border-dashed border-line bg-white px-5 py-8 text-center text-[13px] text-ink-muted">{children}</p>;
}

export function MyActivityView() {
  const { plans, saved, findActivity, prefs, openQuiz, setSelectedId, setView } = useAppState();
  const going = Object.entries(plans)
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([id]) => findActivity(id))
    .filter((a): a is Activity => !!a);
  const savedItems = saved.map(findActivity).filter((a): a is Activity => !!a);
  const open = (id: string) => {
    setView("discover");
    setSelectedId(id);
  };

  return (
    <div className="px-4 pb-10 pt-5 lg:px-7 lg:pt-6">
      <ViewHeader title="My Activity" subtitle="Your plans, saves, and picks — kept privately on this device." />

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Going", value: going.length, icon: CalendarCheck, tint: "#2379EE" },
          { label: "Saved", value: savedItems.length, icon: Heart, tint: "#FF5365" },
          { label: "Vibes", value: prefs?.vibes.length ?? 0, icon: Sparkles, tint: "#00594D" },
        ].map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="rounded-14 border border-line bg-white p-3.5 shadow-card">
            <Icon className="size-4" style={{ color: tint }} />
            <p className="mt-2 text-[22px] font-bold leading-none text-ink">{value}</p>
            <p className="mt-1 text-meta text-ink-muted">{label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="going" className="mt-5">
        <TabsList>
          <TabsTrigger value="going">
            <CalendarCheck /> Going
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Heart /> Saved
          </TabsTrigger>
          <TabsTrigger value="picks">
            <Sparkles /> My picks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="going" className="mt-3">
          {going.length ? (
            <ul className="flex flex-col gap-2.5">
              <AnimatePresence>
                {going.map((a) => (
                  <SavedItem key={a.id} activity={a} onOpen={() => open(a.id)} />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <EmptyNote>RSVP to an event or plan a visit and it will show up here.</EmptyNote>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-3">
          {savedItems.length ? (
            <ul className="flex flex-col gap-2.5">
              <AnimatePresence>
                {savedItems.map((a) => (
                  <SavedItem key={a.id} activity={a} onOpen={() => open(a.id)} />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <EmptyNote>Tap the heart on any activity to save it for later.</EmptyNote>
          )}
        </TabsContent>

        <TabsContent value="picks" className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-14 border border-line bg-white p-4 shadow-card">
            <div>
              <p className="text-micro font-semibold uppercase tracking-[0.12em] text-ink-soft">Current picks</p>
              <p className="mt-1 text-sm font-bold text-ink">{hasCriteria(prefs) ? describePrefs(prefs) : "No picks yet"}</p>
            </div>
            <Button onClick={openQuiz}>
              <Pencil /> {hasCriteria(prefs) ? "Edit picks" : "Take the quiz"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
