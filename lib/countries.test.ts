import { describe, it, expect } from "vitest";
import { COUNTRIES, countryName } from "./countries";

describe("countries", () => {
  it("localizes a country code per locale", () => {
    expect(countryName("PT", "pt")).toBe("Portugal");
    expect(countryName("PT", "en")).toBe("Portugal");
    expect(countryName("CN", "zh")).toBe("中国");
    expect(countryName("CN", "en")).toBe("China");
  });
  it("falls back to the raw code for an unknown country", () => {
    expect(countryName("ZZ", "en")).toBe("ZZ");
  });
  it("every country has all three localized names and a 2-letter code", () => {
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.pt.trim().length).toBeGreaterThan(0);
      expect(c.en.trim().length).toBeGreaterThan(0);
      expect(c.zh.trim().length).toBeGreaterThan(0);
    }
  });
  it("has unique codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
