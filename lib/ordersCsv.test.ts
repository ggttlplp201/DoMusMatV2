import { describe, it, expect } from "vitest";
import { ordersToCsv } from "./ordersCsv";

const rows = [
  {
    id: "o1", created_at: "2026-06-01T10:00:00Z", status: "submitted", source: "cart",
    total_quantity: 5, itemCount: 2, email: "a@x.com", company: 'Acme, "Inc"', country: "PT",
  },
];

describe("ordersToCsv", () => {
  it("emits a header row then one row per order", () => {
    const lines = ordersToCsv(rows).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Order ID");
    expect(lines[0]).toContain("Status");
  });
  it("includes the order field values", () => {
    const csv = ordersToCsv(rows);
    expect(csv).toContain("o1");
    expect(csv).toContain("submitted");
    expect(csv).toContain("a@x.com");
    expect(csv).toContain("PT");
  });
  it("escapes quotes and commas (RFC-4180: wrap in quotes, double internal quotes)", () => {
    expect(ordersToCsv(rows)).toContain('"Acme, ""Inc"""');
  });
  it("returns only the header row for an empty list", () => {
    expect(ordersToCsv([]).split("\n")).toHaveLength(1);
  });
});
