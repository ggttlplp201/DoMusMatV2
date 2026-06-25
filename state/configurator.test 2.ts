import { describe, it, expect, beforeEach } from "vitest";
import { useConfigurator, __resetItemIds } from "./configurator";
import type { ProductMeta, SurfaceDef } from "@/lib/configurator/types";

const floor: SurfaceDef = { id: "floor-master", kind: "floor", pos: [0,0,0], rot: [0,0,0], size: [4,3], normal: [0,1,0] };
const wall: SurfaceDef  = { id: "wall-master-n", kind: "wall", pos: [0,1.35,-1.5], rot: [0,0,0], size: [4,2.7], normal: [0,0,1] };
const lamp: ProductMeta = { ref: "balizador", name: "Bollard", realDimsMm: {w:100,h:900,d:100}, allowedSurfaces: ["floor"] };
const panel: ProductMeta = { ref: "panel", name: "Panel", realDimsMm: {w:600,h:1200,d:40}, allowedSurfaces: ["wall"] };

const s = () => useConfigurator.getState();

beforeEach(() => { useConfigurator.setState({ scene: { room: "house-40x30", surfaces: {}, items: [] }, tool: { kind: "look" }, selectedId: null, editingId: null }); __resetItemIds(); });

describe("paint", () => {
  it("assigns a material to a surface", () => {
    s().paintSurface("floor-master", "oak-01");
    expect(s().scene.surfaces["floor-master"]).toBe("oak-01");
  });
});

describe("place", () => {
  it("places an allowed item and selects it", () => {
    const id = s().placeItem(lamp, floor, [1.2, 9, 0.8]);
    expect(id).toBe("item-1");
    expect(s().scene.items).toHaveLength(1);
    expect(s().scene.items[0]).toMatchObject({ ref: "balizador", surface: "floor-master", pos: [1.2, 0, 0.8], rotY: 0 });
    expect(s().selectedId).toBe("item-1");
  });
  it("rejects an item on a disallowed surface", () => {
    expect(s().placeItem(panel, floor, [0,0,0])).toBeNull();
    expect(s().scene.items).toHaveLength(0);
  });
  it("orients wall items to face into the room", () => {
    s().placeItem(panel, wall, [1, 1.5, -1.5]);
    expect(s().scene.items[0].rotY).toBeCloseTo(0);
    expect(s().scene.items[0].pos[2]).toBeCloseTo(-1.47);
  });
});

describe("move / rotate / delete", () => {
  it("moves an item to a new surface point", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().moveItem(id, floor, [2, 0, 1]);
    expect(s().scene.items[0].pos).toEqual([2, 0, 1]);
  });
  it("rotates by a delta", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().rotateItem(id, Math.PI / 12);
    expect(s().scene.items[0].rotY).toBeCloseTo(Math.PI / 12);
  });
  it("deletes and clears selection/edit", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().beginEdit(id);
    s().deleteItem(id);
    expect(s().scene.items).toHaveLength(0);
    expect(s().selectedId).toBeNull();
    expect(s().editingId).toBeNull();
  });
});

describe("modes", () => {
  it("beginEdit locks to look tool and selects", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().setTool({ kind: "paint", material: "x" });
    s().beginEdit(id);
    expect(s().editingId).toBe(id);
    expect(s().tool).toEqual({ kind: "look" });
  });
  it("escape exits edit first, then exits tool", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().beginEdit(id);
    s().escape();                       // exits edit
    expect(s().editingId).toBeNull();
    s().setTool({ kind: "place", ref: "balizador" });
    s().escape();                       // exits tool
    expect(s().tool).toEqual({ kind: "look" });
  });
});

describe("selection side-effects", () => {
  it("setTool clears the current selection", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    expect(s().selectedId).toBe(id);
    s().setTool({ kind: "paint", material: "oak" });
    expect(s().selectedId).toBeNull();
  });

  it("escape from a tool clears selection and returns to look", () => {
    s().placeItem(lamp, floor, [0,0,0]);
    s().setTool({ kind: "place", ref: "balizador" });
    s().select("item-1");
    s().escape();
    expect(s().tool).toEqual({ kind: "look" });
    expect(s().selectedId).toBeNull();
  });

  it("saveEdit exits edit mode and clears selection", () => {
    const id = s().placeItem(lamp, floor, [0,0,0])!;
    s().beginEdit(id);
    expect(s().editingId).toBe(id);
    s().saveEdit();
    expect(s().editingId).toBeNull();
    expect(s().selectedId).toBeNull();
  });
});
