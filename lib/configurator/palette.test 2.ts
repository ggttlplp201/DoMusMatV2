import { describe, it, expect } from "vitest";
import { paletteFromCartRefs } from "./palette";
import { CONFIGURABLE_PRODUCTS } from "./products";

// A fake resolver that maps known SKUs → product ids
const fakeResolver = (ref: string): string | undefined => {
  const map: Record<string, string> = {
    "DMSL-OL12W004": "balizador-de-jardim-led",
    "DMJR-TP120W001": "barra-led-high-bay",
  };
  return map[ref];
};

describe("paletteFromCartRefs", () => {
  it("resolves a known SKU to its ProductMeta", () => {
    const palette = paletteFromCartRefs(["DMSL-OL12W004"], fakeResolver);
    // "balizador-de-jardim-led" is in CONFIGURABLE_PRODUCTS
    expect(palette).toHaveLength(1);
    expect(palette[0]).toEqual(CONFIGURABLE_PRODUCTS["balizador-de-jardim-led"]);
  });

  it("drops unknown refs (resolver returns undefined)", () => {
    const palette = paletteFromCartRefs(["UNKNOWN-SKU-999"], fakeResolver);
    expect(palette).toHaveLength(0);
  });

  it("drops refs whose product id is not in CONFIGURABLE_PRODUCTS", () => {
    // fakeResolver maps "DMJR-TP120W001" → "barra-led-high-bay"
    // but "barra-led-high-bay" is NOT in CONFIGURABLE_PRODUCTS (only "balizador-de-jardim-led" is)
    const palette = paletteFromCartRefs(["DMJR-TP120W001"], fakeResolver);
    expect(palette).toHaveLength(0);
  });

  it("de-duplicates: two cart refs that map to the same product id appear once", () => {
    // Suppose two different SKUs both point at the same product id
    const multiResolver = (ref: string): string | undefined => {
      if (ref === "DMSL-OL12W004" || ref === "DMSL-OL12W004-B") {
        return "balizador-de-jardim-led";
      }
      return undefined;
    };
    const palette = paletteFromCartRefs(
      ["DMSL-OL12W004", "DMSL-OL12W004-B"],
      multiResolver,
    );
    expect(palette).toHaveLength(1);
    expect(palette[0].ref).toBe("balizador-de-jardim-led");
  });

  it("preserves order of first occurrence", () => {
    const orderedResolver = (ref: string): string | undefined => {
      const map: Record<string, string> = {
        "DMSL-OL12W004": "balizador-de-jardim-led",
      };
      return map[ref];
    };
    const palette = paletteFromCartRefs(
      ["DMJR-UNKNOWN", "DMSL-OL12W004"],
      orderedResolver,
    );
    expect(palette).toHaveLength(1);
    expect(palette[0].ref).toBe("balizador-de-jardim-led");
  });

  it("returns empty array for empty cart", () => {
    expect(paletteFromCartRefs([], fakeResolver)).toHaveLength(0);
  });
});
