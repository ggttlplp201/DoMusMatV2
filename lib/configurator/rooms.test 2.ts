import { describe, it, expect } from "vitest";
import { primitiveHouse, getRoomShell, roomShellFromGltf } from "./rooms";

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
