import type { CaptureSpot } from "./captureSpots";

export type CaptureFn = (spots: CaptureSpot[], width: number) => Promise<Record<string, Blob>>;

let handler: CaptureFn | null = null;

/** PanoCapture registers (and on unmount clears) the capture implementation. */
export function registerCaptureHandler(fn: CaptureFn | null): void {
  handler = fn;
}

/** DOM-side orchestration calls this to capture panos from the live scene. */
export function runCapture(spots: CaptureSpot[], width: number): Promise<Record<string, Blob>> {
  if (!handler) return Promise.reject(new Error("capture handler not ready"));
  return handler(spots, width);
}
