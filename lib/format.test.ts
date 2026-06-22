import { describe, it, expect } from "vitest";
import { formatPrice, formatDimensions } from "./format";

describe("format", () => {
  it("formats a real price", () => { expect(formatPrice(289, "EUR")).toBe("€289.00"); });
  it("returns price-on-request when price is placeholder", () => { expect(formatPrice("PLACEHOLDER", "EUR")).toBe("Preço sob consulta"); });
  it("returns price-on-request when currency is placeholder", () => { expect(formatPrice(289, "PLACEHOLDER")).toBe("Preço sob consulta"); });
  it("formats dimensions", () => { expect(formatDimensions(1200, 150, 67)).toBe("1200 × 150 × 67 mm"); });
});
