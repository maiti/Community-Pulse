"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bike, Bus, Car, Check, Footprints, Hourglass, Sparkles, X } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { CATEGORIES, CATEGORY_ORDER, TIME_BUDGETS, TRAVEL_MODES } from "@/lib/categories";
import { DEFAULT_PREFS } from "@/lib/match";
import type { QuizPrefs, TimeBudget, TravelMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Landscape } from "./decor/Landscape";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";

const STEPS = [
  { short: "Vibe", question: "What's your vibe today?", hint: "Pick as many as you like." },
  { short: "Getting around", question: "How are you getting around?", hint: "We'll keep trips inside your limit." },
  { short: "Time", question: "How much time do you have?", hint: "Drop-in spaces fit any window." },
] as const;

const MODE_ICONS: Record<TravelMode, typeof Bus> = { walk: Footprints, bike: Bike, transit: Bus, ride: Car };

function Chip({
  selected,
  onClick,
  children,
  color = "#009C9F",
  onColor = "#FFFFFF",
  pastel = "#F1F5F9",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  onColor?: string;
  pastel?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        backgroundColor: selected ? color : pastel,
        color: selected ? onColor : "#061D35",
        boxShadow: selected ? `0 0 0 3px ${color}33, 0 8px 18px -10px ${color}` : "0 0 0 0px rgba(0,0,0,0)",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold [&_svg]:size-4"
    >
      {children}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 16, opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
            <Check strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function StepProgress({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={s.short} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
            <button type="button" onClick={() => onJump(i)} className="group flex items-center gap-2" aria-current={current ? "step" : undefined}>
              <motion.span
                animate={{
                  backgroundColor: done || current ? "#009C9F" : "#FFFFFF",
                  borderColor: done || current ? "#009C9F" : "#E5EAF0",
                  color: done || current ? "#FFFFFF" : "#8593A5",
                  scale: current ? 1.08 : 1,
                }}
                className="grid size-6 place-items-center rounded-full border-2 text-micro font-bold"
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </motion.span>
              <span
                className={cn(
                  "hidden whitespace-nowrap text-micro font-semibold sm:inline",
                  current ? "text-ink" : "text-ink-soft group-hover:text-ink-muted",
                )}
              >
                {s.short}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span className="relative mx-2.5 h-[3px] flex-1 overflow-hidden rounded-full bg-line">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-teal to-electric"
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function QuizModal() {
  const { quizOpen, closeQuiz, prefs, setPrefs, feed } = useAppState();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const current: QuizPrefs = prefs ?? DEFAULT_PREFS;

  // Every choice applies immediately so the feed behind the quiz reshuffles live.
  const update = (patch: Partial<QuizPrefs>) => setPrefs({ ...current, ...patch });
  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };
  const finish = () => {
    closeQuiz();
    setStep(0);
  };

  useEffect(() => {
    if (!quizOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuiz();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quizOpen, closeQuiz]);

  return (
    <AnimatePresence>
      {quizOpen && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-labelledby="quiz-question"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed inset-x-3 bottom-[76px] z-40 flex min-h-[320px] flex-col overflow-hidden rounded-18 border border-line bg-white shadow-float lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[min(620px,calc((100vw-102px)*0.45-48px))]"
        >
          <div className="pointer-events-none absolute inset-0 bg-sunset-glow" />
          <Landscape className="absolute inset-x-0 bottom-0 h-[84px] w-full opacity-90" />

          <div className="relative flex items-center gap-4 px-5 pt-4">
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-pastel-butter px-2.5 py-1 text-micro font-bold text-[#9a5f00] 2xl:inline-flex">
              <Sparkles className="size-3.5" /> Find your fit
            </span>
            <div className="min-w-0 flex-1">
              <StepProgress step={step} onJump={go} />
            </div>
            <button
              type="button"
              onClick={closeQuiz}
              className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-canvas hover:text-ink"
              aria-label="Close quiz"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden px-5 pb-3 pt-4">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: 28 * direction }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 * direction }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <h2 id="quiz-question" className="text-[20px] font-bold leading-tight tracking-[-0.01em] text-navy">
                  {STEPS[step].question}
                </h2>
                <p className="mt-0.5 text-meta text-ink-muted">{STEPS[step].hint}</p>

                <div className="mt-3.5 flex flex-wrap gap-2">
                  {step === 0 &&
                    CATEGORY_ORDER.map((id) => {
                      const meta = CATEGORIES[id];
                      const Icon = meta.icon;
                      const selected = current.vibes.includes(id);
                      return (
                        <Chip
                          key={id}
                          selected={selected}
                          color={meta.color}
                          onColor={meta.onColor}
                          pastel={meta.pastel}
                          onClick={() =>
                            update({ vibes: selected ? current.vibes.filter((v) => v !== id) : [...current.vibes, id] })
                          }
                        >
                          <Icon style={{ color: selected ? meta.onColor : meta.color }} />
                          {meta.vibe}
                        </Chip>
                      );
                    })}

                  {step === 1 &&
                    (Object.keys(TRAVEL_MODES) as TravelMode[]).map((mode) => {
                      const Icon = MODE_ICONS[mode];
                      const selected = current.modes.includes(mode);
                      return (
                        <Chip
                          key={mode}
                          selected={selected}
                          color={mode === "transit" ? "#2379EE" : "#009C9F"}
                          pastel={mode === "transit" ? "#E8F1FE" : "#E0F4F4"}
                          onClick={() =>
                            update({ modes: selected ? current.modes.filter((m) => m !== mode) : [...current.modes, mode] })
                          }
                        >
                          <Icon />
                          {TRAVEL_MODES[mode].label}
                        </Chip>
                      );
                    })}

                  {step === 2 && (
                    <>
                      {(Object.keys(TIME_BUDGETS) as TimeBudget[]).map((t) => (
                        <Chip
                          key={t}
                          selected={current.time === t}
                          color="#7952E8"
                          pastel="#EFEAFD"
                          onClick={() => update({ time: current.time === t ? null : t })}
                        >
                          <Hourglass />
                          {TIME_BUDGETS[t].label}
                          <span className="font-medium opacity-60">· {TIME_BUDGETS[t].hint}</span>
                        </Chip>
                      ))}
                    </>
                  )}
                </div>

                {step === 1 && (
                  <div className="mt-4 flex max-w-[380px] items-center gap-4 rounded-14 bg-white/80 px-3 py-1.5 backdrop-blur-sm">
                    <span className="shrink-0 text-meta font-semibold text-ink">
                      Up to <span className="text-teal">{current.maxTravel} min</span>
                    </span>
                    <Slider
                      min={10}
                      max={60}
                      step={5}
                      value={[current.maxTravel]}
                      onValueChange={([v]) => update({ maxTravel: v })}
                      aria-label="Maximum travel time in minutes"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative flex items-center gap-2 px-5 pb-4">
            <p className="mr-auto rounded-full bg-white/85 px-3 py-1 text-meta font-semibold text-navy backdrop-blur-sm" aria-live="polite">
              <motion.span key={feed.length} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block text-teal">
                {feed.length}
              </motion.span>{" "}
              {feed.length === 1 ? "match" : "matches"} nearby
            </p>
            {step > 0 ? (
              <Button variant="outline" size="md" onClick={() => go(step - 1)} className="bg-white/90">
                <ArrowLeft /> Back
              </Button>
            ) : (
              <Button variant="ghost" size="md" onClick={finish} className="bg-white/60">
                Skip for now
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => go(step + 1)}>
                Next <ArrowRight />
              </Button>
            ) : (
              <Button onClick={finish} variant="navy">
                Show my matches <ArrowRight />
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
