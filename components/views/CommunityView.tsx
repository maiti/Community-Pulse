"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Megaphone } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { CATEGORIES } from "@/lib/categories";
import { useLocationState } from "@/lib/location-state";
import type { Activity, CategoryId } from "@/lib/types";
import { TopoLines } from "../decor/TopoLines";
import { ViewHeader } from "./ViewHeader";

type Org = { name: string; activities: Activity[]; categories: CategoryId[] };

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function CommunityView() {
  const { activities, setQuery, setCategory, setView } = useAppState();
  const { profile } = useLocationState();

  const orgs = useMemo(() => {
    const map = new Map<string, Org>();
    for (const a of activities) {
      const org = map.get(a.organization) ?? { name: a.organization, activities: [], categories: [] };
      org.activities.push(a);
      if (!org.categories.includes(a.category)) org.categories.push(a.category);
      map.set(a.organization, org);
    }
    return [...map.values()].sort((a, b) => b.activities.length - a.activities.length || a.name.localeCompare(b.name));
  }, [activities]);

  return (
    <div className="px-4 pb-10 pt-5 lg:px-7 lg:pt-6">
      <ViewHeader title="Community" subtitle={`The groups and places keeping ${profile.name} connected.`} />

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {orgs.map((org, i) => {
          const accent = CATEGORIES[org.categories[0]].color;
          return (
            <motion.li
              key={org.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.04 } }}
              whileHover={{ y: -3 }}
            >
              <button
                type="button"
                onClick={() => {
                  setCategory("all");
                  setQuery(org.name);
                  setView("discover");
                }}
                className="group flex h-full w-full items-start gap-3 rounded-14 border border-line bg-white p-3.5 text-left shadow-card transition-shadow hover:shadow-lift"
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-14 text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${accent}, #061D35)` }}
                >
                  {initials(org.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{org.name}</span>
                  <span className="block text-meta text-ink-muted">
                    {org.activities.length} {org.activities.length === 1 ? "listing" : "listings"}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1">
                    {org.categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-full px-2 py-0.5 text-micro font-semibold text-navy"
                        style={{ background: CATEGORIES[c].pastel }}
                      >
                        {CATEGORIES[c].label}
                      </span>
                    ))}
                  </span>
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-teal" />
              </button>
            </motion.li>
          );
        })}
      </ul>

      <div className="relative mt-5 overflow-hidden rounded-18 bg-navy p-5 text-white">
        <TopoLines
          width={600}
          height={160}
          peaks={[{ x: 520, y: 60, rings: 9, base: 10, step: 14, seed: 77 }]}
          className="absolute inset-0 h-full w-full"
        />
        <Megaphone className="relative size-6 text-amber" />
        <p className="relative mt-2 text-base font-bold">Run a teen program in {profile.name}?</p>
        <p className="relative mt-1 max-w-md text-[13px] text-white/70">
          Libraries, rec centers, and nonprofits can be listed here. Reach out to your district office or city youth
          commission to get your program on the map.
        </p>
      </div>
    </div>
  );
}
