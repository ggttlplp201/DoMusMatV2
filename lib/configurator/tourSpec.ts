import type { CaptureSpot } from "./captureSpots";

/** What the configurator hands to the render pipeline for one tour. */
export interface TourSpec {
  sceneRef: string; // encoded SceneDocument (shareable string)
  time: number;     // time-of-day used for the render
  spots: CaptureSpot[];
}

/** Object path inside the `tours` storage bucket. */
export function panoPath(jobId: string, spotId: string): string {
  return `${jobId}/${spotId}.jpg`;
}

/** Navigation graph: every spot links to all the others. */
export function spotLinks(spots: CaptureSpot[]): Record<string, string[]> {
  const ids = spots.map((s) => s.id);
  const out: Record<string, string[]> = {};
  for (const id of ids) out[id] = ids.filter((other) => other !== id);
  return out;
}
