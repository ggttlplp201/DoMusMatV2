// lib/configurator/serialize.test.ts
import { describe, it, expect } from "vitest";
import { encodeScene, decodeScene } from "./serialize";
import { emptyScene } from "./types";

describe("scene serialization", () => {
  it("round-trips a document", () => {
    const doc = { ...emptyScene("house-40x30"),
      surfaces: { "floor-master": "oak-01" },
      items: [{ id: "item-1", ref: "p", surface: "floor-master", pos: [1,0,1] as [number,number,number], rotY: 0 }] };
    expect(decodeScene(encodeScene(doc))).toEqual(doc);
  });
  it("round-trips a fully populated house scene", () => {
    const doc = {
      room: "house-40x30",
      surfaces: { "floor-master": "walnut", "floor-family": "oak", ceiling: "marble-white" },
      items: [
        { id: "item-1", ref: "balizador-de-jardim-led", surface: "floor-family", pos: [1.2,0,0.8] as [number,number,number], rotY: 1.57 },
        { id: "item-2", ref: "balizador-de-jardim-led", surface: "floor-master", pos: [-2,0,-1] as [number,number,number], rotY: 0 },
      ],
    };
    expect(decodeScene(encodeScene(doc))).toEqual(doc);
  });
  it("returns null on garbage", () => {
    expect(decodeScene("not-valid-base64!!")).toBeNull();
  });

  // Shape validation tests
  it("returns null when items is null (valid JSON, wrong shape)", () => {
    const malformed = encodeURIComponent(btoa(JSON.stringify({ room: "x", surfaces: {}, items: null })));
    expect(decodeScene(malformed)).toBeNull();
  });
  it("returns null when room is missing", () => {
    const malformed = encodeURIComponent(btoa(JSON.stringify({ surfaces: {}, items: [] })));
    expect(decodeScene(malformed)).toBeNull();
  });
  it("returns null when surfaces is null", () => {
    const malformed = encodeURIComponent(btoa(JSON.stringify({ room: "x", surfaces: null, items: [] })));
    expect(decodeScene(malformed)).toBeNull();
  });
  it("returns null when top-level value is null (JSON.parse('null'))", () => {
    const malformed = encodeURIComponent(btoa("null"));
    expect(decodeScene(malformed)).toBeNull();
  });
  it("returns null when encoded via cast of wrong-shape object", () => {
    // encodeScene would enforce types, so manually craft it
    const wrongShape = encodeURIComponent(btoa(JSON.stringify({ room: "x" })));
    expect(decodeScene(wrongShape)).toBeNull();
  });
});
