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

export interface RoomShell {
  id: string;
  surfaces: SurfaceDef[];
  bounds: { min: [number, number]; max: [number, number] }; // walkable x/z extent (m)
  eyeHeight: number;                                         // m
  defaultMaterials: Record<string, string>;                 // surfaceId -> materialId
}

export interface ProductMeta {
  ref: string;
  name: string;
  modelUrl?: string;                                  // undefined → primitive placeholder
  realDimsMm: { w: number; h: number; d: number };
  allowedSurfaces: SurfaceKind[];
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
}

export function emptyScene(roomId: string): SceneDocument {
  return { room: roomId, surfaces: {}, items: [] };
}
