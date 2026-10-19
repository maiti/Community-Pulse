"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, ChevronDown, Landmark, LocateFixed, MapPin, RefreshCw, Search, UserRound, X } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { useLocationState } from "@/lib/location-state";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { LogoMark } from "./decor/Logo";

const noopSubscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function SearchField({ className }: { className?: string }) {
  const { query, setQuery, setView, view } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
  const mac = useSyncExternalStore(noopSubscribe, isMac, () => true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const input = inputRef.current;
      // Both the desktop and mobile fields listen; only the visible one responds.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && input?.offsetParent) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label
      className={cn(
        "group relative flex h-10 items-center gap-2.5 rounded-full border border-line bg-white pl-4 pr-2 shadow-search transition focus-within:border-teal/60 focus-within:shadow-[0_0_0_4px_rgba(0,156,159,0.12)]",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-ink-soft transition group-focus-within:text-teal" />
      <span className="sr-only">Search activities</span>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (view !== "discover" && view !== "map") setView("discover");
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("");
            e.currentTarget.blur();
          }
        }}
        placeholder="Search activities, third spaces, or organizations..."
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-soft focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <AnimatePresence initial={false} mode="popLayout">
        {query ? (
          <motion.button
            key="clear"
            type="button"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            onClick={() => setQuery("")}
            className="grid size-6 place-items-center rounded-full bg-canvas text-ink-muted hover:text-ink"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </motion.button>
        ) : (
          <motion.kbd
            key="kbd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden h-6 items-center rounded-md border border-line bg-canvas px-1.5 font-sans text-micro font-semibold text-ink-muted sm:inline-flex"
          >
            {mac ? "⌘K" : "Ctrl K"}
          </motion.kbd>
        )}
      </AnimatePresence>
    </label>
  );
}

export function Header() {
  const { saved, setSavedOpen, openQuiz, setLocationOpen } = useAppState();
  const { profile } = useLocationState();

  return (
    <header className="relative z-20 shrink-0 border-b border-line bg-white">
      <div className="flex h-[58px] items-center gap-3 px-4 lg:gap-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-2.5 lg:gap-3">
          <LogoMark className="h-8 w-9 lg:hidden" />
          <p className="shrink-0 text-[20px] font-extrabold tracking-[-0.02em]">
            <span className="text-navy">Community</span>
            <span className="text-teal">Pulse</span>
          </p>

          <button
            type="button"
            onClick={() => setLocationOpen(true)}
            className="group inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[#cfe2d6] bg-pastel-sage pl-2 pr-1.5 text-meta font-bold text-forest transition hover:border-forest/40 hover:shadow-card"
            aria-label={`Change region, currently ${profile.label}`}
          >
            {profile.kind === "detected" ? <LocateFixed className="size-3.5" /> : <Landmark className="size-3.5" />}
            {profile.code}
            <ChevronDown className="size-3.5 transition group-hover:translate-y-px" />
          </button>

          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={profile.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="hidden min-w-0 items-center gap-1 truncate text-meta font-medium text-ink-muted md:inline-flex"
            >
              <MapPin className="size-3.5 shrink-0 text-teal" />
              <span className="truncate">{profile.name}</span>
            </motion.span>
          </AnimatePresence>
        </div>

        <SearchField className="mx-auto hidden w-full max-w-[520px] flex-1 lg:flex" />

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0 lg:gap-2.5">
          <Button variant="teal" onClick={openQuiz} className="max-xl:w-10 max-xl:px-0" aria-label="Retake quiz">
            <RefreshCw />
            <span className="hidden xl:inline">Retake Quiz</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setSavedOpen(true)}
            className="relative max-xl:w-10 max-xl:px-0"
            aria-label={`Saved activities (${saved.length})`}
          >
            <Bookmark className="text-ink" />
            <span className="hidden xl:inline">Saved Activities</span>
            <AnimatePresence>
              {saved.length > 0 && (
                <motion.span
                  key={saved.length}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="min-w-5 rounded-full bg-coral px-1.5 text-center text-[10px] font-bold leading-5 text-white max-xl:absolute max-xl:-right-1.5 max-xl:-top-1.5"
                >
                  {saved.length}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
          <div
            className="hidden size-10 place-items-center rounded-full bg-gradient-to-br from-teal to-electric p-[2px] sm:grid"
            title="Your profile"
          >
            <div className="grid size-full place-items-center rounded-full bg-white text-navy">
              <UserRound className="size-[18px]" />
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 lg:hidden">
        <SearchField className="w-full" />
      </div>
    </header>
  );
}
