export type SurfaceKind = "floor" | "wall" | "ceiling";

/** A paintable / placeable surface. `pos/rot/size/normal` describe the primitive
 *  plane used for the dev shell and for snapping; the real GLB supplies the same
 *  metadata per named mesh. Positions in metres. */
export interface SurfaceDef {
  id: string;                 // e.g. "floor-master", "wall-master-n", "ceiling"
  kind: SurfaceKind;
  pos: [number, number, number];
  rot: [number, number, number];
  size: [number, number];
  normal: [number, number, number];
}

/** A preset location where an item of a given category can be placed
 *  (e.g. a door slot at a doorway). Shown as a ghost outline + "+" until filled. */
export interface ItemSlot {
  id: string;
  category: string;                  // matches ProductMeta.category
  pos: [number, number, number];     // floor position (m)
  rotY: number;                      // facing (radians)
  label: string;                     // e.g. "Add door"
  outline: [number, number];         // ghost width × height (m)
}

/** A fixed architectural model (e.g. a window) — always present, non-editable. */
export interface Fixture {
  id: string;
  modelUrl: string;
  pos: [number, number, number];
  rotY: number;
  realDimsMm: { w: number; h: number; d: number };
  ground?: boolean;                  // false → centre at pos (e.g. elevated windows)
  uniform?: boolean;                 // true → uniform scale (fit inside, no distortion)
}

/** A room area that can hold its own interior lighting (bar or ceiling lights). */
export interface LightZone {
  id: string;
  label: string;
  x0: number; z0: number; x1: number; z1: number; // world bounds for placing lights
  ceilingY: number;
}

export interface RoomShell {
  id: string;
  surfaces: SurfaceDef[];
  slots: ItemSlot[];                                         // preset item locations
  fixtures: Fixture[];                                       // fixed décor (windows, …)
  lightZones: LightZone[];                                   // per-room lighting areas
  bounds: { min: [number, number]; max: [number, number] }; // walkable x/z extent (m)
  eyeHeight: number;                                         // m
  defaultMaterials: Record<string, string>;                 // surfaceId -> materialId
}

export interface ProductMeta {
  ref: string;
  name: string;
  category?: string;                                  // slot category this fits ("door", "wardrobe", …)
  modelUrl?: string;                                  // undefined → primitive placeholder
  modelRotY?: number;                                 // intrinsic rotation to normalise the GLB's facing
  realDimsMm: { w: number; h: number; d: number };
  allowedSurfaces: SurfaceKind[];
  sample?: boolean;                                   // stand-in asset; always shown in the palette
}

export interface PlacedItem {
  id: string;
  ref: string;
  surface: string;                                    // surfaceId it is attached to
  pos: [number, number, number];                      // metres
  rotY: number;                                       // radians
}

export interface SceneDocument {
  room: string;
  surfaces: Record<string, string>;                   // surfaceId -> materialId
  items: PlacedItem[];
  slots?: Record<string, string>;                     // slotId -> product ref
}

export function emptyScene(roomId: string): SceneDocument {
  return { room: roomId, surfaces: {}, items: [], slots: {} };
}
