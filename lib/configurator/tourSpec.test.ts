import { describe, it, expect } from "vitest";
import { panoPath, spotLinks } from "./tourSpec";
import type { CaptureSpot } from "./captureSpots";

const spot = (id: string): CaptureSpot => ({ id, label: id, pos: [0, 1.6, 0] });

describe("panoPath", () => {
  it("builds a bucket-relative jpg path with the variant", () => {
    expect(panoPath("job123", "living", "day")).toBe("job123/living-day.jpg");
    expect(panoPath("job123", "living", "night")).toBe("job123/living-night.jpg");
  });
});

describe("spotLinks", () => {
  it("links every spot to all others (not itself)", () => {
    expect(spotLinks([spot("a"), spot("b"), spot("c")])).toEqual({
      a: ["b", "c"],
      b: ["a", "c"],
      c: ["a", "b"],
    });
  });

  it("gives a lone spot no links", () => {
    expect(spotLinks([spot("a")])).toEqual({ a: [] });
  });
});
