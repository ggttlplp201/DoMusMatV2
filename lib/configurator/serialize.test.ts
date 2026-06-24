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
  it("returns null on garbage", () => {
    expect(decodeScene("not-valid-base64!!")).toBeNull();
  });
});
