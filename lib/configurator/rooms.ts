import type * as THREE_NS from "three";
import type { Fixture, ItemSlot, LightZone, RoomShell, SurfaceDef, SurfaceKind } from "./types";

const FT = 0.3048;
const DEFAULT_H = 3.1;                     // ceiling height (m)
const CORNER_EPS = 0.04;                   // extend wall runs this far past their ends so perpendicular
                                           // walls overlap at corners (seals the hairline daylight gap)
const DOOR_OPENING_H = 2.1;               // doorway opening height (m); wall above is a header
const WIN_SILL = 0.95, WIN_HEAD = 1.985;  // window band (m) — sized to the window model's 1.32 aspect
const WIN_URL = "/models/window.glb";
const WIN_WIDTH_FT = 4.5;                  // all openings equal width so the window model fits uniformly

/** an opening in a wall run; sill defaults to 0 (door), head defaults to door height */
type Opening = { a: number; b: number; sill?: number; head?: number };
type WinSide = "south" | "north" | "west" | "east";
type Window = { wall: WinSide; center: number };

// ---- low-level builders (operate in world metres; dimension-agnostic) -------
function floorZone(id: string, x1: number, x2: number, z1: number, z2: number): SurfaceDef {
  return { id, kind: "floor", pos: [(x1 + x2) / 2, 0, (z1 + z2) / 2], rot: [-Math.PI / 2, 0, 0], size: [Math.abs(x2 - x1), Math.abs(z2 - z1)], normal: [0, 1, 0] };
}

function wallPiece(id: string, axis: "x" | "z", fixed: number, a: number, b: number, yLo: number, yHi: number): SurfaceDef {
  const len = b - a, mid = (a + b) / 2, h = yHi - yLo, yc = (yLo + yHi) / 2;
  return axis === "x"
    ? { id, kind: "wall", pos: [mid, yc, fixed], rot: [0, 0, 0],         size: [len, h], normal: [0, 0, 1] }
    : { id, kind: "wall", pos: [fixed, yc, mid], rot: [0, Math.PI / 2, 0], size: [len, h], normal: [1, 0, 0] };
}

/** Build a wall run with door/window openings: full-height solid segments beside
 *  each opening, a sill below (windows) and a header above (doors + windows). */
function wallRun(idBase: string, axis: "x" | "z", fixed: number, from: number, to: number, openings: Opening[], wallTop: number, ceilH: number): SurfaceDef[] {
  // extend the run a hair past each end so it overlaps the perpendicular wall at
  // corners — without this, single-plane walls leave a hairline gap that leaks daylight
  const lo = Math.min(from, to) - CORNER_EPS, hi = Math.max(from, to) + CORNER_EPS;
  const ops = openings
    .map((o) => ({ a: Math.min(o.a, o.b), b: Math.max(o.a, o.b), sill: o.sill ?? 0, head: o.head ?? DOOR_OPENING_H }))
    .filter((o) => o.b > lo && o.a < hi)
    .map((o) => ({ ...o, a: Math.max(o.a, lo), b: Math.min(o.b, hi) }))
    .sort((p, q) => p.a - q.a);
  const segs: SurfaceDef[] = [];
  let i = 0, cursor = lo;
  for (const o of ops) {
    if (o.a - cursor > 0.05) segs.push(wallPiece(`${idBase}-${i++}`, axis, fixed, cursor, o.a, 0, wallTop)); // beside, full height
    if (o.sill > 0.05)       segs.push(wallPiece(`${idBase}-${i++}`, axis, fixed, o.a, o.b, 0, o.sill)); // sill below window
    if (o.head < ceilH - 0.05) segs.push(wallPiece(`${idBase}-${i++}`, axis, fixed, o.a, o.b, o.head, wallTop)); // header above
    cursor = Math.max(cursor, o.b);
  }
  if (hi - cursor > 0.05) segs.push(wallPiece(`${idBase}-${i++}`, axis, fixed, cursor, hi, 0, wallTop));
  return segs;
}

function toRunOpenings(openings: Array<[number, number] | Opening>, map: (v: number) => number): Opening[] {
  return openings.map((o) => {
    const oo = Array.isArray(o) ? { a: o[0], b: o[1] } : o;
    return { a: map(oo.a), b: map(oo.b), sill: oo.sill, head: oo.head };
  });
}

// ---- dimension-aware helper factory ----------------------------------------
// Plans are authored top-down in FEET: x 0→wFt (west→east), y 0→dFt (south→north).
// 3D: x = west→east, z = north(−)→south(+), y = up. Origin at footprint centre.
function planHelpers(wFt: number, dFt: number, ceilH = DEFAULT_H) {
  const W = wFt * FT, D = dFt * FT;
  const HX = W / 2, HZ = D / 2;
  const WALL_TOP = ceilH + 0.06;          // walls extend just above the ceiling (avoids z-fight seam)
  const px = (xft: number) => xft * FT - HX;   // plan-x (ft) → 3D x (m)
  const pz = (yft: number) => HZ - yft * FT;   // plan-y (ft) → 3D z (m)

  const floorFt = (id: string, xa: number, ya: number, xb: number, yb: number): SurfaceDef =>
    floorZone(id, px(xa), px(xb), pz(ya), pz(yb));
  const hWallFt = (id: string, y: number, xa: number, xb: number, openings: Array<[number, number] | Opening> = []): SurfaceDef[] =>
    wallRun(id, "x", pz(y), px(xa), px(xb), toRunOpenings(openings, px), WALL_TOP, ceilH);
  const vWallFt = (id: string, x: number, ya: number, yb: number, openings: Array<[number, number] | Opening> = []): SurfaceDef[] =>
    wallRun(id, "z", px(x), pz(ya), pz(yb), toRunOpenings(openings, pz), WALL_TOP, ceilH);
  const ceiling = (): SurfaceDef =>
    ({ id: "ceiling", kind: "ceiling", pos: [0, ceilH, 0], rot: [Math.PI / 2, 0, 0], size: [W + 0.16, D + 0.16], normal: [0, -1, 0] });

  const ceilY = ceilH - 0.02;
  const zone = (id: string, label: string, xa: number, ya: number, xb: number, yb: number): LightZone =>
    ({ id, label, x0: px(xa), z0: pz(yb), x1: px(xb), z1: pz(ya), ceilingY: ceilY });

  const door = (id: string, xft: number, yft: number, rotY: number, label: string): ItemSlot =>
    ({ id, category: "door", pos: [px(xft), 0, pz(yft)], rotY, label, outline: [0.9, 2.1] });
  const dresser = (id: string, xft: number, yft: number, rotY: number): ItemSlot =>
    ({ id, category: "dresser", pos: [px(xft), 0, pz(yft)], rotY, label: "Add dresser", outline: [1.7, 1.0] });
  const table = (id: string, xft: number, yft: number, rotY: number): ItemSlot =>
    ({ id, category: "table", pos: [px(xft), 0, pz(yft)], rotY, label: "Add table", outline: [1.2, 0.75] });
  const slot = (id: string, category: string, xft: number, yft: number, rotY: number, label: string, outline: [number, number]): ItemSlot =>
    ({ id, category, pos: [px(xft), 0, pz(yft)], rotY, label, outline });

  // windows: equal-width openings + matching fixed models, centred in each opening
  const winSpan = (w: Window) => ({ a: w.center - WIN_WIDTH_FT / 2, b: w.center + WIN_WIDTH_FT / 2 });
  const winOpenings = (windows: Window[], wall: WinSide): Opening[] =>
    windows.filter((w) => w.wall === wall).map((w) => ({ ...winSpan(w), sill: WIN_SILL, head: WIN_HEAD }));
  const windowFixtures = (windows: Window[]): Fixture[] => {
    const midY = (WIN_SILL + WIN_HEAD) / 2;
    const winH = (WIN_HEAD - WIN_SILL) * 1000;
    const winW = WIN_WIDTH_FT * FT * 1000;
    return windows.map((w, idx) => {
      const { a, b } = winSpan(w);
      const dims = { w: winW, h: winH, d: 120 };
      if (w.wall === "north" || w.wall === "south") {
        const z = w.wall === "north" ? pz(dFt) : pz(0);
        return { id: `win-${idx}`, modelUrl: WIN_URL, pos: [px((a + b) / 2), midY, z], rotY: 0, realDimsMm: dims, ground: false, uniform: true };
      }
      const x = w.wall === "west" ? px(0) : px(wFt);
      return { id: `win-${idx}`, modelUrl: WIN_URL, pos: [x, midY, pz((a + b) / 2)], rotY: Math.PI / 2, realDimsMm: dims, ground: false, uniform: true };
    });
  };

  const bounds = { min: [-HX, -HZ] as [number, number], max: [HX, HZ] as [number, number] };

  return { px, pz, floorFt, hWallFt, vWallFt, ceiling, zone, door, dresser, table, slot, winOpenings, windowFixtures, bounds };
}

/** Fill defaults: wood floor everywhere, plaster (wallpaper) on walls + ceiling. */
function defaultMaterialsFor(surfaces: SurfaceDef[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of surfaces) out[s.id] = s.kind === "floor" ? "wood-floor-051" : "wallpaper";
  return out;
}

// ---- plan 1: Main Floor — open living + bedrooms, 40'×30' --------------------
export function primitiveHouse(): RoomShell {
  const h = planHelpers(40, 30);
  const WINDOWS: Window[] = [
    { wall: "north", center: 3.5 }, { wall: "north", center: 16.5 }, { wall: "north", center: 33 },
    { wall: "west", center: 6.5 }, { wall: "west", center: 24.5 },
    { wall: "south", center: 4 }, { wall: "south", center: 22.5 },
    { wall: "east", center: 24 },
  ];
  const surfaces: SurfaceDef[] = [
    // floor zones (tile the whole plan)
    h.floorFt("floor-bedroom2", 0, 18, 9, 30),
    h.floorFt("floor-storage", 9, 18, 13, 30),
    h.floorFt("floor-bedroom3", 13, 18, 22, 30),
    h.floorFt("floor-bathroom", 22, 18, 27, 30),
    h.floorFt("floor-master", 27, 18, 40, 30),
    h.floorFt("floor-mcloset", 34, 10, 40, 18),
    h.floorFt("floor-washroom", 34, 0, 40, 10),
    h.floorFt("floor-family", 0, 0, 15, 18),
    h.floorFt("floor-dining", 15, 0, 24, 18),
    h.floorFt("floor-kitchen", 24, 0, 34, 18),
    h.ceiling(),
    // exterior shell (entry/washroom doors + windows)
    ...h.hWallFt("wall-south", 0, 0, 40, [{ a: 13, b: 16 }, ...h.winOpenings(WINDOWS, "south")]),
    ...h.hWallFt("wall-north", 30, 0, 40, h.winOpenings(WINDOWS, "north")),
    ...h.vWallFt("wall-west", 0, 0, 30, h.winOpenings(WINDOWS, "west")),
    ...h.vWallFt("wall-east", 40, 0, 30, [{ a: 3, b: 6 }, ...h.winOpenings(WINDOWS, "east")]),
    // top-band divider (room south walls), x 0→34 — 3ft door openings
    ...h.hWallFt("wall-divider", 18, 0, 34, [[6, 9], [19, 22], [24, 27], [28, 31]]),
    // top-band vertical partitions, y 18→30
    ...h.vWallFt("wall-br2-storage", 9, 18, 30, [[23, 25]]),
    ...h.vWallFt("wall-storage-br3", 13, 18, 30, [[23, 25]]),
    ...h.vWallFt("wall-br3-bath", 22, 18, 30),
    ...h.vWallFt("wall-bath-master", 27, 18, 30),
    // east service block
    ...h.vWallFt("wall-service-w", 34, 0, 18, [[4, 7]]),
    ...h.hWallFt("wall-closet-wash", 10, 34, 40),
    ...h.hWallFt("wall-master-closet", 18, 34, 40, [[36, 38]]),
  ];

  const slots: ItemSlot[] = [
    h.door("slot-door-entry", 14.5, 0, 0, "Add entry door"),
    h.door("slot-door-br2", 7.5, 18, 0, "Add door"),
    h.door("slot-door-br3", 20.5, 18, 0, "Add door"),
    h.door("slot-door-bath", 25.5, 18, 0, "Add door"),
    h.door("slot-door-master", 29.5, 18, 0, "Add door"),
    h.door("slot-door-wash", 40, 4.5, Math.PI / 2, "Add door"),
    h.slot("slot-wardrobe-master", "wardrobe", 37, 14, Math.PI, "Add wardrobe", [1.2, 2.0]),
    h.slot("slot-cabinet-entry", "cabinet", 18, 1.5, 0, "Add cabinet", [0.9, 1.0]),
    h.dresser("slot-dresser-br2", 8, 20.5, -Math.PI / 2),
    h.dresser("slot-dresser-br3", 21, 24, -Math.PI / 2),
    h.dresser("slot-dresser-master", 28, 24, Math.PI / 2),
    h.table("slot-table-dining", 19.5, 9, 0),
    h.table("slot-table-family", 7, 9, 0),
  ];

  const lightZones: LightZone[] = [
    h.zone("living", "Living / Dining / Kitchen", 2, 1, 33, 16),
    h.zone("bedroom2", "Bedroom #2", 1, 19, 8, 29),
    h.zone("bedroom3", "Bedroom #3", 14, 19, 21, 29),
    h.zone("master", "Master Bedroom", 28, 19, 39, 29),
  ];

  return {
    id: "house-40x30",
    surfaces, slots, fixtures: h.windowFixtures(WINDOWS), lightZones,
    bounds: h.bounds, eyeHeight: 1.6, defaultMaterials: defaultMaterialsFor(surfaces),
    // same preset rule as the other home: bedrooms get 1, master gets 3; the big
    // open living/dining/kitchen zone keeps more so it isn't dim
    defaultLights: {
      living: { type: "ceiling", count: 6 },
      bedroom2: { type: "ceiling", count: 1 },
      bedroom3: { type: "ceiling", count: 1 },
      master: { type: "ceiling", count: 3 },
    },
  };
}

// ---- plan 2: Upper Floor — bedrooms + bath + walk-in, 30'×32' ----------------
// Layout (north = top): BR#3 (NW), Walk-in (N-centre), Master (NE);
// BR#2 (SW), Bathroom (S), central stair/landing hall in the middle.
export function upperFloor(): RoomShell {
  const h = planHelpers(30, 32);
  const WINDOWS: Window[] = [
    { wall: "west", center: 6 }, { wall: "west", center: 26 },        // BR#2, BR#3
    { wall: "north", center: 6 }, { wall: "north", center: 24 },      // BR#3, Master
    { wall: "south", center: 6 }, { wall: "south", center: 21 },      // BR#2, Bathroom
    { wall: "east", center: 5 }, { wall: "east", center: 25 },        // Bathroom, Master
  ];
  const surfaces: SurfaceDef[] = [
    // floor zones (tile the whole 30×32 plan)
    h.floorFt("floor-bedroom2", 0, 0, 12, 12),     // SW
    h.floorFt("floor-hall-w", 0, 12, 12, 20),      // west hall between the bedrooms
    h.floorFt("floor-bedroom3", 0, 20, 12, 32),    // NW
    h.floorFt("floor-bathroom", 12, 0, 30, 11),    // S
    h.floorFt("floor-hall", 12, 11, 18, 24),       // central landing / stairs
    h.floorFt("floor-walkin", 12, 24, 18, 32),     // N-centre
    h.floorFt("floor-hall-e", 18, 11, 30, 18),     // east landing
    h.floorFt("floor-master", 18, 18, 30, 32),     // NE
    h.ceiling(),
    // exterior shell (windows only — staircase is the floor's "entry")
    ...h.hWallFt("wall-south", 0, 0, 30, h.winOpenings(WINDOWS, "south")),
    ...h.hWallFt("wall-north", 32, 0, 30, h.winOpenings(WINDOWS, "north")),
    ...h.vWallFt("wall-west", 0, 0, 32, h.winOpenings(WINDOWS, "west")),
    ...h.vWallFt("wall-east", 30, 0, 32, h.winOpenings(WINDOWS, "east")),
    // west column partitions (bedroom doors open onto the west hall)
    ...h.hWallFt("wall-br2-hall", 12, 0, 12, [[8, 11]]),    // BR#2 north wall + door
    ...h.hWallFt("wall-br3-hall", 20, 0, 12, [[8, 11]]),    // BR#3 south wall + door
    // x=12 spine: solid except where the west hall meets the central hall
    ...h.vWallFt("wall-spine-w", 12, 0, 32, [[12, 20]]),
    // central hall ↔ bathroom (door) and ↔ east landing (open below master)
    ...h.hWallFt("wall-bath-n", 11, 12, 30, [[14, 17]]),    // bathroom north wall + door
    // master enclosure: west wall (entry door + walk-in door), south wall solid
    ...h.vWallFt("wall-master-w", 18, 18, 32, [[19, 22], [26, 29]]),
    ...h.hWallFt("wall-master-s", 18, 18, 30),
    // walk-in south wall (accessed from master, so solid here)
    ...h.hWallFt("wall-walkin-s", 24, 12, 18),
  ];

  const slots: ItemSlot[] = [
    h.door("u-door-br2", 9.5, 12, 0, "Add door"),
    h.door("u-door-br3", 9.5, 20, 0, "Add door"),
    h.door("u-door-bath", 15.5, 11, 0, "Add door"),
    h.door("u-door-master", 18, 20.5, Math.PI / 2, "Add door"),
    h.door("u-door-walkin", 18, 27.5, Math.PI / 2, "Add door"),
    h.dresser("u-dresser-br2", 11, 4, -Math.PI / 2),     // BR#2 east wall, faces west (clear of the north door)
    h.dresser("u-dresser-br3", 1, 26, Math.PI / 2),      // BR#3 west wall, faces east
    h.dresser("u-dresser-master", 29, 25, -Math.PI / 2), // master east wall, faces west
    // single wardrobe against the master's north wall, doors facing into the room (south)
    h.slot("u-wardrobe-master", "wardrobe", 27, 31, 0, "Add wardrobe", [1.2, 2.0]),
  ];

  const lightZones: LightZone[] = [
    h.zone("u-bedroom2", "Bedroom #2", 1, 1, 11, 11),
    h.zone("u-bedroom3", "Bedroom #3", 1, 21, 11, 31),
    h.zone("u-bathroom", "Bathroom", 13, 1, 29, 10),
    h.zone("u-master", "Master Bedroom", 19, 19, 29, 31),
    h.zone("u-walkin", "Walk-in", 13, 25, 17, 31),
    h.zone("u-hall", "Hallway", 12.5, 11.5, 17.5, 23.5),
  ];

  return {
    id: "upper-30x32",
    surfaces, slots, fixtures: h.windowFixtures(WINDOWS), lightZones,
    bounds: h.bounds, eyeHeight: 1.6, defaultMaterials: defaultMaterialsFor(surfaces),
    defaultLights: {
      "u-bedroom2": { type: "ceiling", count: 1 },
      "u-bedroom3": { type: "ceiling", count: 1 },
      "u-bathroom": { type: "ceiling", count: 1 },
      "u-master": { type: "ceiling", count: 3 },
      "u-walkin": { type: "ceiling", count: 1 },
      "u-hall": { type: "ceiling", count: 3 },
    },
  };
}

// ---- floor-plan registry ----------------------------------------------------
export interface FloorPlan { id: string; label: string; build: () => RoomShell; }
export const FLOOR_PLANS: FloorPlan[] = [
  { id: "house-40x30", label: "Open Plan Home", build: primitiveHouse },
  { id: "upper-30x32", label: "Bedroom Home", build: upperFloor },
];

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
  const fallback = planHelpers(40, 30);
  return { id, surfaces, slots: [], fixtures: [], lightZones: [], bounds: fallback.bounds, eyeHeight: 1.6, defaultMaterials: {}, defaultLights: {} };
}

export function getRoomShell(id: string, gltf?: THREE_NS.Object3D): RoomShell {
  if (gltf) return roomShellFromGltf(gltf, id);
  const plan = FLOOR_PLANS.find((p) => p.id === id) ?? FLOOR_PLANS[0];
  return plan.build();
}
