import type { SceneDocument } from "./types";

// Material/surface ids are ascii slugs, so btoa/atob are safe here.
export function encodeScene(doc: SceneDocument): string {
  return encodeURIComponent(btoa(JSON.stringify(doc)));
}

export function decodeScene(s: string): SceneDocument | null {
  try {
    return JSON.parse(atob(decodeURIComponent(s))) as SceneDocument;
  } catch {
    return null;
  }
}
