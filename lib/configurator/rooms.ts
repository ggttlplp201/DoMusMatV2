import type * as THREE_NS from "three";
import type { RoomShell, SurfaceDef, SurfaceKind } from "./types";

const FT = 0.3048;
const W = 40 * FT;   // 12.19 m  (x)
const D = 30 * FT;   //  9.14 m  (z)
const H = 2.7;       // ceiling height (assumption — confirm)

function floorZone(id: string, cx: number, cz: number, w: number, d: number): SurfaceDef {
  return { id, kind: "floor", pos: [cx, 0, cz], rot: [-Math.PI / 2, 0, 0], size: [w, d], normal: [0, 1, 0] };
}
function perimeterWall(id: string, pos: [number,number,number], rotY: number, len: number, normal: [number,number,number]): SurfaceDef {
  return { id, kind: "wall", pos, rot: [0, rotY, 0], size: [len, H], normal };
}

/** Coarse dev shell: north half = bedrooms/master, south half = open-plan + service.
 *  Replaced by roomShellFromGltf when public/models/house-40x30.glb exists. */
export function primitiveHouse(): RoomShell {
  const surfaces: SurfaceDef[] = [
    // per-room floor zones (coarse) — north band (z<0) then south band (z>0)
    floorZone("floor-bedroom2", -W/2 + W*0.12, -D/2 + D*0.25, W*0.24, D*0.5),
    floorZone("floor-bedroom3", -W/2 + W*0.36, -D/2 + D*0.25, W*0.24, D*0.5),
    floorZone("floor-master",    W/2 - W*0.18, -D/2 + D*0.25, W*0.36, D*0.5),
    floorZone("floor-bathroom",  0,            -D/2 + D*0.25, W*0.16, D*0.5),
    floorZone("floor-family",   -W/2 + W*0.20,  D/2 - D*0.25, W*0.40, D*0.5),
    floorZone("floor-dining",    W*0.02,         D/2 - D*0.25, W*0.22, D*0.5),
    floorZone("floor-kitchen",   W/2 - W*0.22,   D/2 - D*0.25, W*0.28, D*0.5),
    floorZone("floor-washroom",  W/2 - W*0.06,   D/2 - D*0.12, W*0.12, D*0.24),
    // ceiling
    { id: "ceiling", kind: "ceiling", pos: [0, H, 0], rot: [Math.PI/2, 0, 0], size: [W, D], normal: [0,-1,0] },
    // perimeter walls (face inward)
    perimeterWall("wall-north", [0, H/2, -D/2], 0,            W, [0,0,1]),
    perimeterWall("wall-south", [0, H/2,  D/2], Math.PI,      W, [0,0,-1]),
    perimeterWall("wall-east",  [ W/2, H/2, 0], -Math.PI/2,   D, [-1,0,0]),
    perimeterWall("wall-west",  [-W/2, H/2, 0],  Math.PI/2,   D, [1,0,0]),
  ];
  return {
    id: "house-40x30",
    surfaces,
    bounds: { min: [-W/2, -D/2], max: [W/2, D/2] },
    eyeHeight: 1.6,
    defaultMaterials: { ceiling: "#f4f4f4" },
  };
}

const SURFACE_PREFIX: Record<string, SurfaceKind> = { floor: "floor", wall: "wall", ceiling: "ceiling" };

/** Build a RoomShell from a loaded GLB: every mesh named floor-*, wall-*, or ceiling
 *  becomes a SurfaceDef (geometry read from its world bbox). */
export function roomShellFromGltf(root: THREE_NS.Object3D, id: string): RoomShell {
  const surfaces: SurfaceDef[] = [];
  root.traverse((o) => {
    const kindKey = o.name.split("-")[0];
    const kind = SURFACE_PREFIX[kindKey];
    if (!kind) return;
    // The GLB authoring standard stores pos/normal/size in mesh.userData; fall back to identity.
    const ud = (o.userData ?? {}) as Partial<SurfaceDef>;
    surfaces.push({
      id: o.name,
      kind,
      pos: ud.pos ?? [o.position.x, o.position.y, o.position.z],
      rot: ud.rot ?? [0, 0, 0],
      size: ud.size ?? [1, 1],
      normal: ud.normal ?? (kind === "floor" ? [0,1,0] : kind === "ceiling" ? [0,-1,0] : [0,0,1]),
    });
  });
  return { id, surfaces, bounds: { min: [-W/2, -D/2], max: [W/2, D/2] }, eyeHeight: 1.6, defaultMaterials: {} };
}

export function getRoomShell(id: string, gltf?: THREE_NS.Object3D): RoomShell {
  if (gltf) return roomShellFromGltf(gltf, id);
  return primitiveHouse(); // only preset for now
}
