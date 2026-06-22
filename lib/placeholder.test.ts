import { describe, it, expect } from "vitest";
import { isPlaceholder, resolvePlaceholder, hasRealValue } from "./placeholder";

describe("placeholder", () => {
  it("flags the sentinel string", () => { expect(isPlaceholder("PLACEHOLDER")).toBe(true); });
  it("flags null/undefined", () => { expect(isPlaceholder(null)).toBe(true); expect(isPlaceholder(undefined)).toBe(true); });
  it("accepts real values", () => { expect(isPlaceholder(289)).toBe(false); expect(isPlaceholder("CE")).toBe(false); });
  it("resolves to fallback when placeholder", () => { expect(resolvePlaceholder("PLACEHOLDER", "—")).toBe("—"); });
  it("passes real values through", () => { expect(resolvePlaceholder(289, "—")).toBe(289); });
  it("hasRealValue is the inverse", () => { expect(hasRealValue("CE")).toBe(true); expect(hasRealValue("PLACEHOLDER")).toBe(false); });
});
