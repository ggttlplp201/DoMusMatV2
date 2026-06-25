import type { SurfaceDef, SurfaceKind, ProductMeta } from "./types";

export function isAllowedSurface(meta: ProductMeta, kind: SurfaceKind): boolean {
  return meta.allowedSurfaces.includes(kind);
}

/** Snap a raw raycast hit onto a surface. Floor → stand on ground; ceiling → hang
 *  at ceiling height; wall → flush against the wall, nudged along its normal. */
export function snapPos(surface: SurfaceDef, point: [number, number, number]): [number, number, number] {
  const [x, y, z] = point;
  if (surface.kind === "floor") return [x, 0, z];
  if (surface.kind === "ceiling") return [x, surface.pos[1], z];
  const [nx, , nz] = surface.normal;
  return [x + nx * 0.03, y, z + nz * 0.03];
}

/** Y rotation so a wall-mounted item faces into the room. */
export function wallRotY(surface: SurfaceDef): number {
  const [nx, , nz] = surface.normal;
  return Math.atan2(nx, nz);
}

export function clampToBounds(
  x: number,
  z: number,
  bounds: { min: [number, number]; max: [number, number] },
  margin = 0.4,
): [number, number] {
  return [
    Math.min(Math.max(x, bounds.min[0] + margin), bounds.max[0] - margin),
    Math.min(Math.max(z, bounds.min[1] + margin), bounds.max[1] - margin),
  ];
}
