import type { SceneDocument } from "./types";

// Material/surface ids are ascii slugs, so btoa/atob are safe here.
export function encodeScene(doc: SceneDocument): string {
  return encodeURIComponent(btoa(JSON.stringify(doc)));
}

function isValidSceneDocument(val: unknown): val is SceneDocument {
  if (val === null || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  if (typeof obj.room !== "string") return false;
  if (obj.surfaces === null || typeof obj.surfaces !== "object" || Array.isArray(obj.surfaces)) return false;
  if (!Array.isArray(obj.items)) return false;
  return true;
}

export function decodeScene(s: string): SceneDocument | null {
  try {
    const parsed: unknown = JSON.parse(atob(decodeURIComponent(s)));
    if (!isValidSceneDocument(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
