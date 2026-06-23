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

  it('Chinese query "镜" → mirror products (all category espelhos)', () => {
    const result = filterProducts(repo.getProducts(), emptyFilters, "镜");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(p => p.category === "espelhos")).toBe(true);
  });

  it('English query "mirror" → mirror products', () => {
    const result = filterProducts(repo.getProducts(), emptyFilters, "mirror");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(p => p.category === "espelhos")).toBe(true);
  });

  it("every category is findable by its localized name in PT, EN and ZH", () => {
    const all = repo.getProducts();
    for (const cat of repo.getCategories()) {
      const catProducts = all.filter(p => p.category === cat.id);
      for (const [locale, term] of [["pt", cat.name], ["en", cat.name_en], ["zh", cat.name_zh]] as const) {
        const ids = new Set(filterProducts(all, emptyFilters, term).map(p => p.id));
        // every product in this category must be returned by searching the category's name
        const missing = catProducts.filter(p => !ids.has(p.id)).map(p => p.id);
        expect(missing, `${locale} search "${term}" missed ${missing.join(",")}`).toHaveLength(0);
      }
    }
  });

  it("every product is findable by its own localized name (PT/EN/ZH)", () => {
    const all = repo.getProducts();
    for (const p of all) {
      for (const name of [p.name, p.name_en, p.name_zh]) {
        const ids = new Set(filterProducts(all, emptyFilters, name).map(x => x.id));
        expect(ids.has(p.id), `product "${name}" (${p.id}) not found by its own name`).toBe(true);
      }
    }
  });

  it('lenient CJK: "镜子" returns the same results as "镜"', () => {
    const a = filterProducts(repo.getProducts(), emptyFilters, "镜").map(p => p.id).sort();
    const b = filterProducts(repo.getProducts(), emptyFilters, "镜子").map(p => p.id).sort();
    expect(b.length).toBeGreaterThan(0);
    expect(b).toEqual(a);
  });

  it('accent-insensitive: "iluminacao" matches lighting products', () => {
    const r = filterProducts(repo.getProducts(), emptyFilters, "iluminacao");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every(p => p.category === "iluminacao-led")).toBe(true);
  });

  it('accent-insensitive: "rodape" matches the rodapes category', () => {
    const r = filterProducts(repo.getProducts(), emptyFilters, "rodape");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some(p => p.category === "rodapes")).toBe(true);
  });

  it("facetOptions power contains 200 and is sorted ascending", () => {
    const { power } = facetOptions(repo.getProducts());
    expect(power).toContain(200);
    const sorted = [...power].sort((a, b) => a - b);
    expect(power).toEqual(sorted);
  });
});
