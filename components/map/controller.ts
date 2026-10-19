import type { Activity } from "@/lib/types";

/** Imperative handle both map renderers expose to the shared toolbar. */
export type MapController = {
  zoomBy: (factor: number) => void;
  /** Re-fit every activity in the district and reset rotation. */
  recenter: () => void;
  fitActivities: (activities: Activity[]) => void;
};
