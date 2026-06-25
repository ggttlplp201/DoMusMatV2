import { describe, it, expect } from "vitest";
import { equirectSize } from "./equirect";

describe("equirectSize", () => {
  it("is 2:1 (width × width/2)", () => {
    expect(equirectSize(4096)).toEqual([4096, 2048]);
    expect(equirectSize(1000)).toEqual([1000, 500]);
  });
});
