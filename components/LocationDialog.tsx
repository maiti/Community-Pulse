"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Check, Landmark, LoaderCircle, LocateFixed, Search } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { useLocationState } from "@/lib/location-state";
import type { LocationProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TopoLines } from "./decor/TopoLines";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

const DETECT_MESSAGES = {
  denied: "Location permission was blocked. You can still pick a district below.",
  unavailable: "We couldn't get your location right now. Pick a district below.",
} as const;

function ProfileRow({ profile, active, onPick }: { profile: LocationProfile; active: boolean; onPick: () => void }) {
  const Icon = profile.kind === "municipal" ? Building2 : profile.kind === "detected" ? LocateFixed : Landmark;
  return (
    <li>
      <motion.button
        type="button"
        onClick={onPick}
        whileHover={{ x: 3 }}
        className={cn(
          "flex w-full items-center gap-3 rounded-14 border px-3 py-2.5 text-left transition-colors",
          active ? "border-teal/40 bg-teal-soft" : "border-transparent hover:border-line hover:bg-canvas",
        )}
      >
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-12 text-meta font-bold",
            active ? "bg-teal text-white" : "bg-pastel-sage text-forest",
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink">{profile.name}</span>
            <span className="rounded-full border border-line bg-white px-1.5 text-micro font-semibold text-ink-muted">{profile.code}</span>
          </span>
          <span className="block truncate text-meta text-ink-muted">{profile.label}</span>
        </span>
        {active && <Check className="size-4 text-teal" />}
      </motion.button>
    </li>
  );
}

export function LocationDialog() {
  const { locationOpen, setLocationOpen, setSelectedId, setHoveredId } = useAppState();
  const { profile, profiles, setProfileId, detectLocation, detectStatus } = useLocationState();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = profiles.filter((p) => !q || [p.name, p.code, p.label].some((s) => s.toLowerCase().includes(q)));
  const congressional = matches.filter((p) => p.kind !== "municipal");
  const municipal = matches.filter((p) => p.kind === "municipal");

  const pick = (id: string) => {
    setProfileId(id);
    setSelectedId(null);
    setHoveredId(null);
    setLocationOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
      <DialogContent className="max-w-[480px] overflow-hidden p-0">
        <div className="relative overflow-hidden bg-navy px-6 pb-5 pt-6 text-white">
          <TopoLines
            width={480}
            height={140}
            peaks={[
              { x: 420, y: 30, rings: 8, base: 10, step: 13, seed: 5 },
              { x: 60, y: 150, rings: 6, base: 12, step: 13, seed: 9 },
            ]}
            className="absolute inset-0 h-full w-full"
          />
          <DialogTitle className="relative text-[22px] text-white">Choose your community</DialogTitle>
          <DialogDescription className="relative mt-1 text-white/70">
            CommunityPulse works in any congressional district or city. Pick one, or use where you are.
          </DialogDescription>
        </div>

        <div className="space-y-3 p-4">
          <button
            type="button"
            onClick={async () => {
              if (await detectLocation()) pick("detected");
            }}
            disabled={detectStatus === "locating"}
            className="flex w-full items-center gap-3 rounded-14 border border-dashed border-teal/50 bg-teal-soft/50 px-3 py-2.5 text-left transition hover:bg-teal-soft disabled:opacity-70"
          >
            <span className="grid size-10 place-items-center rounded-12 bg-teal text-white">
              {detectStatus === "locating" ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">{detectStatus === "locating" ? "Finding you…" : "Use my current location"}</span>
              <span className="block text-meta text-ink-muted">Your location stays on this device.</span>
            </span>
          </button>
          {(detectStatus === "denied" || detectStatus === "unavailable") && (
            <p className="rounded-12 bg-coral/10 px-3 py-2 text-meta text-[#b3263a]" role="status">
              {DETECT_MESSAGES[detectStatus]}
            </p>
          )}

          <label className="flex h-10 items-center gap-2 rounded-full border border-line bg-canvas px-3.5 focus-within:border-teal/60">
            <Search className="size-4 text-ink-soft" />
            <span className="sr-only">Search districts</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by city or district (e.g. IL-07)"
              className="h-full flex-1 bg-transparent text-[13px] placeholder:text-ink-soft focus:outline-none"
            />
          </label>

          <div className="scrollbar-thin max-h-[300px] space-y-3 overflow-y-auto pr-1">
            {congressional.length > 0 && (
              <section>
                <h3 className="px-1 pb-1 text-micro font-bold uppercase tracking-[0.12em] text-ink-soft">Congressional districts</h3>
                <ul className="space-y-1">
                  {congressional.map((p) => (
                    <ProfileRow key={p.id} profile={p} active={p.id === profile.id} onPick={() => pick(p.id)} />
                  ))}
                </ul>
              </section>
            )}
            {municipal.length > 0 && (
              <section>
                <h3 className="px-1 pb-1 text-micro font-bold uppercase tracking-[0.12em] text-ink-soft">Local municipalities</h3>
                <ul className="space-y-1">
                  {municipal.map((p) => (
                    <ProfileRow key={p.id} profile={p} active={p.id === profile.id} onPick={() => pick(p.id)} />
                  ))}
                </ul>
              </section>
            )}
            {matches.length === 0 && (
              <p className="px-2 py-6 text-center text-[13px] text-ink-muted">
                No district matches “{query}”. Try “Use my current location”.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
