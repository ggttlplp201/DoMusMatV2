import { describe, it, expect } from "vitest";
import { isValidSpec } from "./tourJobs";

describe("isValidSpec", () => {
  it("accepts a spec with spots", () => {
    expect(isValidSpec({ sceneRef: "x", time: 9, spots: [{ id: "a", label: "A", pos: [0, 0, 0] }] })).toBe(true);
  });
  it("rejects missing/empty spots and non-objects", () => {
    expect(isValidSpec(null)).toBe(false);
    expect(isValidSpec({ sceneRef: "x", time: 9, spots: [] })).toBe(false);
    expect(isValidSpec({ sceneRef: "x", time: 9 })).toBe(false);
  });
});
