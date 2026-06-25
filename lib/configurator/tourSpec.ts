import type { CaptureSpot } from "./captureSpots";

/** What the configurator hands to the render pipeline for one tour. */
export interface TourSpec {
  sceneRef: string; // encoded SceneDocument (shareable string)
  time: number;     // time-of-day used for the render
  spots: CaptureSpot[];
}

/** Day/night variants rendered per spot. */
export type TourVariant = "day" | "night";
export const VARIANT_TIMES: Record<TourVariant, number> = { day: 13, night: 21 };

/** Object path inside the `tours` storage bucket. */
export function panoPath(jobId: string, spotId: string, variant: TourVariant): string {
  return `${jobId}/${spotId}-${variant}.jpg`;
}

/** Navigation graph: every spot links to all the others. */
export function spotLinks(spots: CaptureSpot[]): Record<string, string[]> {
  const ids = spots.map((s) => s.id);
  const out: Record<string, string[]> = {};
  for (const id of ids) out[id] = ids.filter((other) => other !== id);
  return out;
}
