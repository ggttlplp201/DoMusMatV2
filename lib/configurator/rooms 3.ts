import type * as THREE_NS from "three";
import type { Fixture, ItemSlot, LightZone, RoomShell, SurfaceDef, SurfaceKind } from "./types";

const FT = 0.3048;
const W = 40 * FT;   // 12.19 m  (x, west→east)
const D = 30 * FT;   //  9.14 m  (z, south→north)
const H = 3.1;          // ceiling height
const WALL_TOP = H + 0.06; // walls extend just above the ceiling (avoids z-fighting seam)
const HX = W / 2;
const HZ = D / 2;

// ---- plan-coordinate mapping ------------------------------------------------
// Plan is top-down in FEET: x 0→40 (west→east), y 0→30 (south→north).
// 3D: x = west→east, z = north(−)→south(+), y = up. Origin at footprint centre.
const px = (xft: number) => xft * FT - HX;       // plan-x (ft) → 3D x (m)
const pz = (yft: number) => HZ - yft * FT;       // plan-y (ft) → 3D z (m)

function floorZone(id: string, x1: number, x2: number, z1: number, z2: number): SurfaceDef {
  return { id, kind: "floor", pos: [(x1 + x2) / 2, 0, (z1 + z2) / 2], rot: [-Math.PI / 2, 0, 0], size: [Math.abs(x2 - x1), Math.abs(z2 - z1)], normal: [0, 1, 0] };
}
/** plan floor rect (feet) → SurfaceDef */
function floorFt(id: string, xa: number, ya: number, xb: number, yb: number): SurfaceDef {
  return floorZone(id, px(xa), px(xb), pz(ya), pz(yb));
}

const DOOR_OPENING_H = 2.1;          // doorway opening height (m); wall above is a header
const WIN_SILL = 0.95, WIN_HEAD = 1.985; // window band (m) — sized to the window model's 1.32 aspect (no top/bottom gap)

/** an opening in a wall run; sill defaults to 0 (door), head defaults to door height */
type Opening = { a: number; b: number; sill?: number; head?: number };

function wallPiece(id: string, axis: "x" | "z", fixed: number, a: number, b: number, yLo: number, yHi: number): SurfaceDef {
  const len = b - a, mid = (a + b) / 2, h = yHi - yLo, yc = (yLo + yHi) / 2;
  return axis === "x"
    ? { id, kind: "wall", pos: [mid, yc, fixed], rot: [0, 0, 0],         size: [len, h], normal: [0, 0, 1] }
    : { id, kind: "wall", pos: [fixed, yc, mid], rot: [0, Math.PI / 2, 0], size: [len, h], normal: [1, 0, 0] };
}

/** Build a wall run with door/window openings: full-height solid segments beside
 *  each opening, a sill below (windows) and a header above (doors + windows). */
function wallRun(idBase: string, axis: "x" | "z", fixed: number, from: number, to: number, openings: Opening[] = []): SurfaceDef[] {
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const ops = openings
    .map((o) => ({ a: Math.min(o.a, o.b), b: Math.max(o.a, o.b), sill: o.sill ?? 0, head: o.head ?? DOOR_OPENING_H }))
    .filter((o) => o.b > lo && o.a < hi)
    .map((o) => ({ ...o, a: Math.max(o.a, lo), b: Math.min(o.b, hi) }))
    .sort((p, q) => p.a - q.a);
  const segs: SurfaceDef[] = [];
  let i = 0, cursor = lo;
  for (const o of ops) {
    if (o.a - cursor > 0.05) segs.push(wallPiece(`${idBase}-${i++}`, axis, fixed, cursor, o.a, 0, WALL_TOP)); // beside, full height
    if (o.sill > 0.05)       segs.push(wallPiece(`${idBase}-${i++}`, axis, fixed, o.a, o.b, 0, o.sill)); // sill below window
    if (o.head < H - 0.05)   segs.push(wallPiece(`${idBase}-${i++}`, axis, fixed, o.a, o.b, o.head, WALL_TOP)); // header above
    cursor = Math.max(cursor, o.b);
  }
  if (hi - cursor > 0.05) segs.push(wallPiece(`${idBase}-${i++}`, axis, fixed, cursor, hi, 0, WALL_TOP));
  return segs;
}

function toRunOpenings(openings: Array<[number, number] | Opening>, map: (v: number) => number): Opening[] {
  return openings.map((o) => {
    const oo = Array.isArray(o) ? { a: o[0], b: o[1] } : o;
    return { a: map(oo.a), b: map(oo.b), sill: oo.sill, head: oo.head };
  });
}
/** horizontal plan wall at plan-y (ft), spanning plan-x xa→xb (ft); openings in plan-x (ft) */
function hWallFt(id: string, y: number, xa: number, xb: number, openings: Array<[number, number] | Opening> = []): SurfaceDef[] {
  return wallRun(id, "x", pz(y), px(xa), px(xb), toRunOpenings(openings, px));
}
/** vertical plan wall at plan-x (ft), spanning plan-y ya→yb (ft); openings in plan-y (ft) */
function vWallFt(id: string, x: number, ya: number, yb: number, openings: Array<[number, number] | Opening> = []): SurfaceDef[] {
  return wallRun(id, "z", px(x), pz(ya), pz(yb), toRunOpenings(openings, pz));
}

/** Procedural shell following the 40'×30' floor plan exactly (rooms, walls, door
 *  openings per spec). Replaced by roomShellFromGltf when a real GLB exists. */
// fixed exterior windows (plan coords, ft) — cut openings + place models, never editable.
// All openings are the SAME width so the window model fits uniformly (no squish).
const WIN_URL = "/models/window.glb";
const WIN_WIDTH_FT = 4.5;
const WINDOWS: { wall: "south" | "north" | "west" | "east"; center: number }[] = [
  { wall: "north", center: 3.5 },
  { wall: "north", center: 16.5 },
  { wall: "north", center: 33 },
  { wall: "west",  center: 6.5 },
  { wall: "west",  center: 24.5 },
  { wall: "south", center: 4 },
  { wall: "south", center: 22.5 },
  { wall: "east",  center: 24 },
];
const winSpan = (w: { center: number }) => ({ a: w.center - WIN_WIDTH_FT / 2, b: w.center + WIN_WIDTH_FT / 2 });
const winOpenings = (wall: string): Opening[] =>
  WINDOWS.filter((w) => w.wall === wall).map((w) => ({ ...winSpan(w), sill: WIN_SILL, head: WIN_HEAD }));

export function primitiveHouse(): RoomShell {
  const surfaces: SurfaceDef[] = [
    // ---------- floor zones (tile the whole plan) ----------
    // top band (bedrooms / storage / bath / master), y 18→30
    floorFt("floor-bedroom2", 0, 18, 9, 30),
    floorFt("floor-storage",  9, 18, 13, 30),
    floorFt("floor-bedroom3", 13, 18, 22, 30),
    floorFt("floor-bathroom", 22, 18, 27, 30),
    floorFt("floor-master",   27, 18, 40, 30),
    // east service column (washroom now runs to the south wall — no living-room notch)
    floorFt("floor-mcloset",  34, 10, 40, 18),
    floorFt("floor-washroom", 34, 0, 40, 10),
    // open living area (no internal walls)
    floorFt("floor-family",   0, 0, 15, 18),
    floorFt("floor-dining",   15, 0, 24, 18),
    floorFt("floor-kitchen",  24, 0, 34, 18),
    // ---------- ceiling ----------
    { id: "ceiling", kind: "ceiling", pos: [0, H, 0], rot: [Math.PI / 2, 0, 0], size: [W + 0.16, D + 0.16], normal: [0, -1, 0] },
    // ---------- exterior shell (entry/washroom doors + windows) ----------
    ...hWallFt("wall-south", 0,  0, 40, [{ a: 13, b: 16 }, ...winOpenings("south")]),
    ...hWallFt("wall-north", 30, 0, 40, winOpenings("north")),
    ...vWallFt("wall-west",  0,  0, 30, winOpenings("west")),
    ...vWallFt("wall-east",  40, 0, 30, [{ a: 3, b: 6 }, ...winOpenings("east")]),
    // ---------- top-band divider (room south walls), x 0→34 — 3ft door openings ----------
    ...hWallFt("wall-divider", 18, 0, 34, [[6, 9], [19, 22], [24, 27], [28, 31]]),
    // ---------- top-band vertical partitions, y 18→30 ----------
    ...vWallFt("wall-br2-storage", 9,  18, 30, [[23, 25]]),  // closet door to BR2
    ...vWallFt("wall-storage-br3", 13, 18, 30, [[23, 25]]),  // closet door to BR3
    ...vWallFt("wall-br3-bath",    22, 18, 30),
    ...vWallFt("wall-bath-master", 27, 18, 30),
    // ---------- east service block ----------
    ...vWallFt("wall-service-w", 34, 0, 18, [[4, 7]]),       // service west wall (full) + washroom door
    ...hWallFt("wall-closet-wash", 10, 34, 40),              // closet ↔ washroom
    ...hWallFt("wall-master-closet", 18, 34, 40, [[36, 38]]),// master ↔ closet opening
  ];

  // defaults: wood floor, plaster walls + ceiling
  const defaultMaterials: Record<string, string> = {};
  for (const s of surfaces) {
    if (s.kind === "floor") defaultMaterials[s.id] = "wood-floor-051";
    else defaultMaterials[s.id] = "wallpaper"; // walls + ceiling
  }

  // preset item slots: doorways (category "door") + a couple of furniture spots
  const door = (id: string, xft: number, yft: number, rotY: number, label: string): ItemSlot =>
    ({ id, category: "door", pos: [px(xft), 0, pz(yft)], rotY, label, outline: [0.9, 2.1] });
  const slots: ItemSlot[] = [
    door("slot-door-entry",  14.5, 0,  0,            "Add entry door"),
    door("slot-door-br2",    7.5,  18, 0,            "Add door"),
    door("slot-door-br3",    20.5, 18, 0,            "Add door"),
    door("slot-door-bath",   25.5, 18, 0,            "Add door"),
    door("slot-door-master", 29.5, 18, 0,            "Add door"),
    door("slot-door-wash",   40,   4.5, Math.PI / 2, "Add door"),
    { id: "slot-wardrobe-master", category: "wardrobe", pos: [px(37), 0, pz(14)], rotY: Math.PI, label: "Add wardrobe", outline: [1.2, 2.0] },
    { id: "slot-cabinet-entry",   category: "cabinet",  pos: [px(18), 0, pz(1.5)], rotY: 0,        label: "Add cabinet",  outline: [0.9, 1.0] },
  ];

  // fixed window models, centred in their (equal-size) wall openings; uniform fit = no squish
  const midY = (WIN_SILL + WIN_HEAD) / 2;
  const winH = (WIN_HEAD - WIN_SILL) * 1000;
  const winW = WIN_WIDTH_FT * FT * 1000;
  const fixtures: Fixture[] = WINDOWS.map((w, idx) => {
    const { a, b } = winSpan(w);
    const dims = { w: winW, h: winH, d: 120 };
    if (w.wall === "north" || w.wall === "south") {
      const z = w.wall === "north" ? pz(30) : pz(0);
      return { id: `win-${idx}`, modelUrl: WIN_URL, pos: [px((a + b) / 2), midY, z], rotY: 0, realDimsMm: dims, ground: false, uniform: true };
    }
    const x = w.wall === "west" ? px(0) : px(40);
    return { id: `win-${idx}`, modelUrl: WIN_URL, pos: [x, midY, pz((a + b) / 2)], rotY: Math.PI / 2, realDimsMm: dims, ground: false, uniform: true };
  });

  // per-room lighting zones (world bounds inset from walls); each can hold bar or ceiling lights
  const ceilY = H - 0.02;
  const zone = (id: string, label: string, xa: number, ya: number, xb: number, yb: number): LightZone =>
    ({ id, label, x0: px(xa), z0: pz(yb), x1: px(xb), z1: pz(ya), ceilingY: ceilY });
  const lightZones: LightZone[] = [
    zone("living",   "Living / Dining / Kitchen", 2, 1, 33, 16),
    zone("bedroom2", "Bedroom #2",                1, 19, 8, 29),
    zone("bedroom3", "Bedroom #3",                14, 19, 21, 29),
    zone("master",   "Master Bedroom",            28, 19, 39, 29),
  ];

  return {
    id: "house-40x30",
    surfaces,
    slots,
    fixtures,
    lightZones,
    bounds: { min: [-HX, -HZ], max: [HX, HZ] },
    eyeHeight: 1.6,
    defaultMaterials,
  };
}

const SURFACE_PREFIX: Record<string, SurfaceKind> = { floor: "floor", wall: "wall", ceiling: "ceiling" };

/** Build a RoomShell from a loaded GLB: every mesh named floor-*, wall-*, or ceiling
 *  becomes a SurfaceDef (geometry read from its world bbox). */
export function roomShellFromGltf(root: THREE_NS.Object3D, id: string): RoomShell {
  const surfaces: SurfaceDef[] = [];
  root.traverse((o) => {
    if (!(o as { isMesh?: boolean }).isMesh) return; // surfaces come from meshes only
    const kindKey = o.name.split("-")[0];
    const kind = SURFACE_PREFIX[kindKey];
    if (!kind) return;
    const ud = (o.userData ?? {}) as Partial<SurfaceDef>;
    surfaces.push({
      id: o.name,
      kind,
      pos: ud.pos ?? [o.position.x, o.position.y, o.position.z],
      rot: ud.rot ?? [0, 0, 0],
      size: ud.size ?? [1, 1],
      normal: ud.normal ?? (kind === "floor" ? [0, 1, 0] : kind === "ceiling" ? [0, -1, 0] : [0, 0, 1]),
    });
  });
  return { id, surfaces, slots: [], fixtures: [], lightZones: [], bounds: { min: [-HX, -HZ], max: [HX, HZ] }, eyeHeight: 1.6, defaultMaterials: {} };
}

export function getRoomShell(id: string, gltf?: THREE_NS.Object3D): RoomShell {
  if (gltf) return roomShellFromGltf(gltf, id);
  return primitiveHouse(); // only preset for now
}
