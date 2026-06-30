import { describe, it, expect } from "vitest";
import { primitiveHouse, upperFloor, getRoomShell, roomShellFromGltf, FLOOR_PLANS } from "./rooms";

describe("primitiveHouse", () => {
  it("exposes per-room floor zones, walls and a ceiling", () => {
    const r = primitiveHouse();
    const ids = r.surfaces.map((s) => s.id);
    expect(ids).toContain("floor-master");
    expect(ids).toContain("floor-family");
    expect(ids).toContain("ceiling");
    expect(r.surfaces.some((s) => s.kind === "wall")).toBe(true);
  });
  it("has a walkable bounds inside the 12.19x9.14 footprint", () => {
    const r = primitiveHouse();
    expect(r.bounds.min[0]).toBeCloseTo(-6.1, 1);
    expect(r.bounds.max[1]).toBeCloseTo(4.57, 1);
    expect(r.eyeHeight).toBe(1.6);
  });
  it("getRoomShell falls back to the primitive house for the default id", () => {
    expect(getRoomShell("house-40x30").surfaces.length).toBeGreaterThan(0);
  });
});

describe("upperFloor", () => {
  it("exposes the bedrooms, bath and walk-in floor zones", () => {
    const ids = upperFloor().surfaces.map((s) => s.id);
    for (const id of ["floor-bedroom2", "floor-bedroom3", "floor-master", "floor-bathroom", "floor-walkin", "ceiling"]) {
      expect(ids).toContain(id);
    }
  });
  it("has per-room light zones so lights/minimap/tour all work", () => {
    const r = upperFloor();
    expect(r.lightZones.length).toBeGreaterThanOrEqual(4);
    expect(r.lightZones.map((z) => z.label)).toContain("Master Bedroom");
  });
  it("has unique surface and slot ids and at least one window fixture", () => {
    const r = upperFloor();
    const sIds = r.surfaces.map((s) => s.id);
    const slotIds = r.slots.map((s) => s.id);
    expect(new Set(sIds).size).toBe(sIds.length);
    expect(new Set(slotIds).size).toBe(slotIds.length);
    expect(r.fixtures.length).toBeGreaterThan(0);
  });
  it("offers preset slots for the catalogue categories", () => {
    const cats = new Set(upperFloor().slots.map((s) => s.category));
    for (const c of ["door", "dresser", "wardrobe"]) expect(cats).toContain(c);
  });
  it("has a single wardrobe and a hall light zone, and no cabinet slot", () => {
    const r = upperFloor();
    expect(r.slots.filter((s) => s.category === "wardrobe").length).toBe(1);
    expect(r.slots.some((s) => s.category === "cabinet")).toBe(false);
    expect(r.lightZones.some((z) => z.id === "u-hall")).toBe(true);
    expect(r.defaultLights["u-hall"]).toEqual({ type: "ceiling", count: 3 });
    expect(r.defaultLights["u-master"]).toEqual({ type: "ceiling", count: 3 });
  });
});

describe("FLOOR_PLANS registry", () => {
  it("registers both plans with unique ids", () => {
    const ids = FLOOR_PLANS.map((p) => p.id);
    expect(ids).toEqual(["house-40x30", "upper-30x32"]);
  });
  it("getRoomShell resolves a registered plan by id", () => {
    expect(getRoomShell("upper-30x32").id).toBe("upper-30x32");
  });
  it("getRoomShell falls back to the first plan for an unknown id", () => {
    expect(getRoomShell("nope").id).toBe("house-40x30");
  });
});

describe("roomShellFromGltf", () => {
  it("builds surfaces only from meshes, skipping non-mesh nodes with matching names", () => {
    const fakeRoot = {
      traverse(cb: (o: any) => void) {
        [
          { name: "floor-master", isMesh: true, position: { x: 0, y: 0, z: 0 }, userData: {} },
          { name: "floor-entry", isMesh: false, position: { x: 1, y: 0, z: 1 }, userData: {} }, // a Group — must be skipped
          { name: "wall-north", isMesh: true, position: { x: 0, y: 1, z: -4 }, userData: {} },
          { name: "Light", isMesh: false, position: { x: 0, y: 2, z: 0 }, userData: {} },
        ].forEach(cb);
      },
    } as unknown as Parameters<typeof roomShellFromGltf>[0];
    const shell = roomShellFromGltf(fakeRoot, "house-40x30");
    const ids = shell.surfaces.map((s) => s.id);
    expect(ids).toEqual(["floor-master", "wall-north"]);
  });
});
