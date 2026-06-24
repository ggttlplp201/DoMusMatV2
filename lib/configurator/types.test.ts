import { describe, it, expect } from "vitest";
import { emptyScene } from "./types";

describe("emptyScene", () => {
  it("creates an empty document for the given room", () => {
    const s = emptyScene("house-40x30");
    expect(s).toEqual({ room: "house-40x30", surfaces: {}, items: [] });
  });
});
