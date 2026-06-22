import { describe, it, expect } from "vitest";
import { repo } from "./repository";
import { filterProducts, facetOptions } from "./filter";

const emptyFilters = { category: [], power: [], ip: [], colorTemp: [] };

describe("filterProducts", () => {
  it("empty filters + empty query → all 47 products", () => {
    const result = filterProducts(repo.getProducts(), emptyFilters, "");
    expect(result).toHaveLength(47);
  });

  it("category filter for pavimentos → 5 products", () => {
    const result = filterProducts(repo.getProducts(), { ...emptyFilters, category: ["pavimentos"] }, "");
    expect(result).toHaveLength(5);
    expect(result.every(p => p.category === "pavimentos")).toBe(true);
  });

  it("power filter [200] → includes the High Bay product", () => {
    const result = filterProducts(repo.getProducts(), { ...emptyFilters, power: [200] }, "");
    const highBay = result.find(p => p.id === "barra-led-high-bay");
    expect(highBay).toBeDefined();
  });

  it('query "espelho" → only mirror products (all category espelhos)', () => {
    const result = filterProducts(repo.getProducts(), emptyFilters, "espelho");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(p => p.category === "espelhos")).toBe(true);
  });

  it("facetOptions power contains 200 and is sorted ascending", () => {
    const { power } = facetOptions(repo.getProducts());
    expect(power).toContain(200);
    const sorted = [...power].sort((a, b) => a - b);
    expect(power).toEqual(sorted);
  });
});
