import { describe, it, expect } from "vitest";
import { buildOrderPayload } from "./order";
import { repo } from "./repository";

const sample = repo.getProducts()[0];
const sampleRef = sample.variants[0].ref;

describe("buildOrderPayload", () => {
  it("snapshots product id/name/category for a known ref", () => {
    const p = buildOrderPayload([{ ref: sampleRef, quantity: 3 }], { source: "cart", locale: "en" });
    expect(p.items).toHaveLength(1);
    const it0 = p.items[0];
    expect(it0.product_ref).toBe(sampleRef);
    expect(it0.product_id).toBe(sample.id);
    expect(it0.product_name_snapshot).toBe(sample.name);
    expect(it0.category).toBe(sample.category);
    expect(it0.quantity).toBe(3);
  });
  it("sums total_quantity and passes through source/locale/note", () => {
    const ref2 = repo.getProducts()[1].variants[0].ref;
    const p = buildOrderPayload(
      [{ ref: sampleRef, quantity: 2 }, { ref: ref2, quantity: 5 }],
      { source: "bom", locale: "zh", note: "urgent" },
    );
    expect(p.total_quantity).toBe(7);
    expect(p.source).toBe("bom");
    expect(p.locale).toBe("zh");
    expect(p.note).toBe("urgent");
    expect(p.items).toHaveLength(2);
  });
  it("keeps an unknown ref but with empty product_id and the ref as snapshot", () => {
    const p = buildOrderPayload([{ ref: "NOPE-404", quantity: 1 }], { source: "cart", locale: "pt" });
    expect(p.items[0].product_id).toBe("");
    expect(p.items[0].product_name_snapshot).toBe("NOPE-404");
    expect(p.items[0].category).toBe("");
  });
  it("drops non-positive quantities and defaults note to empty string", () => {
    const p = buildOrderPayload([{ ref: sampleRef, quantity: 0 }], { source: "cart", locale: "en" });
    expect(p.items).toHaveLength(0);
    expect(p.total_quantity).toBe(0);
    expect(p.note).toBe("");
  });
});
