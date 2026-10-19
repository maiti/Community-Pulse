"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AppStateProvider, useAppState } from "@/lib/app-state";
import { LocationProvider } from "@/lib/location-state";
import { cn } from "@/lib/utils";
import { DiscoveryFeed } from "./DiscoveryFeed";
import { Header } from "./Header";
import { LocationDialog } from "./LocationDialog";
import { MapView } from "./MapView";
import { PlanDialog } from "./PlanDialog";
import { QuizModal } from "./QuizModal";
import { SavedSheet } from "./SavedSheet";
import { MobileNav, Sidebar } from "./Sidebar";
import { CommunityView } from "./views/CommunityView";
import { MyActivityView } from "./views/MyActivityView";
import { ResourcesView } from "./views/ResourcesView";

function LeftPane() {
  const { view } = useAppState();
  const paneKey = view === "map" ? "discover" : view;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={paneKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="scrollbar-thin h-full overflow-y-auto overscroll-contain"
      >
        {paneKey === "discover" && <DiscoveryFeed />}
        {paneKey === "activity" && <MyActivityView />}
        {paneKey === "community" && <CommunityView />}
        {paneKey === "resources" && <ResourcesView />}
      </motion.div>
    </AnimatePresence>
  );
}

function Shell() {
  const { view } = useAppState();
  const mapOnly = view === "map";

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="relative flex min-h-0 flex-1">
          <div
            className={cn(
              "min-w-0 bg-canvas transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:shrink-0",
              mapOnly ? "hidden lg:block lg:w-0 lg:overflow-hidden" : "w-full lg:w-[55%]",
            )}
          >
            <LeftPane />
          </div>
          <div className={cn("relative min-w-0 flex-1 lg:block lg:border-l lg:border-line", mapOnly ? "block" : "hidden")}>
            <MapView className="absolute inset-0" />
          </div>
        </main>
        <MobileNav />
      </div>

      <QuizModal />
      <SavedSheet />
      <PlanDialog />
      <LocationDialog />
    </div>
  );
}

export default function CommunityPulseApp() {
  return (
    <MotionConfig reducedMotion="user">
      <LocationProvider>
        <AppStateProvider>
          <Shell />
        </AppStateProvider>
      </LocationProvider>
    </MotionConfig>
  );
}
