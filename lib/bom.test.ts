import { describe, it, expect } from "vitest";
import { buildBomLines, toCsv } from "@/lib/bom";

describe("BOM builder", () => {
  it("buildBomLines([{ ref: 'DMJR-TP200W003', quantity: 3 }]) returns 1 line with correct product name, quantity, and prices", () => {
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 3 }]);
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toContain("Barra LED High Bay");
    expect(lines[0].quantity).toBe(3);
    expect(lines[0].unitPrice).toBe("Price on request");
    expect(lines[0].lineTotal).toBe("Price on request");
  });

  it("toCsv(buildBomLines([{ ref: 'DMJR-TP200W003', quantity: 3 }])) has header and quoted reference in second row", () => {
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 3 }]);
    const csv = toCsv(lines);
    const rows = csv.split("\n");
    expect(rows[0]).toContain("Reference");
    expect(rows[1]).toContain('"DMJR-TP200W003"');
  });

  it("buildBomLines([{ ref: 'NOPE', quantity: 1 }]) returns 1 line with name === 'NOPE' and unitPrice === 'Price on request'", () => {
    const lines = buildBomLines([{ ref: "NOPE", quantity: 1 }]);
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toBe("NOPE");
    expect(lines[0].unitPrice).toBe("Price on request");
  });
});
