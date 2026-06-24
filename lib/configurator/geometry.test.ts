import { describe, it, expect } from "vitest";
import { isAllowedSurface, snapPos, wallRotY, clampToBounds } from "./geometry";
import type { SurfaceDef, ProductMeta } from "./types";

const floor: SurfaceDef = { id: "floor-x", kind: "floor", pos: [0,0,0], rot: [0,0,0], size: [4,3], normal: [0,1,0] };
const wallN: SurfaceDef = { id: "wall-n", kind: "wall", pos: [0,1.35,-1.5], rot: [0,0,0], size: [4,2.7], normal: [0,0,1] };
const panel: ProductMeta = { ref: "p", name: "Panel", realDimsMm: {w:600,h:1200,d:40}, allowedSurfaces: ["wall"] };

describe("rules", () => {
  it("allows only listed surface kinds", () => {
    expect(isAllowedSurface(panel, "wall")).toBe(true);
    expect(isAllowedSurface(panel, "floor")).toBe(false);
  });
});

describe("snapPos", () => {
  it("drops floor items to y=0 keeping x/z", () => {
    expect(snapPos(floor, [1.2, 5, 0.8])).toEqual([1.2, 0, 0.8]);
  });
  it("offsets wall items along the surface normal", () => {
    expect(snapPos(wallN, [1, 1.5, -1.5])).toEqual([1, 1.5, -1.5 + 0.03]);
  });
});

describe("wallRotY", () => {
  it("faces into the room from a north wall (normal +z)", () => {
    expect(wallRotY(wallN)).toBeCloseTo(Math.atan2(0, 1)); // 0
  });
});

describe("clampToBounds", () => {
  it("keeps a point inside the walkable area with a margin", () => {
    const b = { min: [-6, -4.5] as [number,number], max: [6, 4.5] as [number,number] };
    expect(clampToBounds(100, 100, b, 0.4)).toEqual([5.6, 4.1]);
    expect(clampToBounds(0, 0, b, 0.4)).toEqual([0, 0]);
  });
});
