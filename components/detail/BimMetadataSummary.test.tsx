import { render, screen } from "@testing-library/react";
import { BimMetadataSummary } from "./BimMetadataSummary";
import { repo } from "@/lib/repository";

describe("BimMetadataSummary", () => {
  it("never renders the text PLACEHOLDER for barra-led-high-bay", () => {
    const product = repo.getProduct("barra-led-high-bay");
    if (!product) throw new Error("Product barra-led-high-bay not found");

    const { container } = render(<BimMetadataSummary product={product} />);

    // No element with the exact text "PLACEHOLDER"
    expect(screen.queryByText(/PLACEHOLDER/)).toBeNull();

    // The entire rendered text must not contain "PLACEHOLDER" anywhere
    expect(container.textContent).not.toContain("PLACEHOLDER");
  });

  it("renders known real values and dashes for all-placeholder fields", () => {
    const product = repo.getProduct("barra-led-high-bay");
    if (!product) throw new Error("Product barra-led-high-bay not found");

    const { container } = render(<BimMetadataSummary product={product} />);

    // version is a real value
    expect(container.textContent).toContain("1.0.0");

    // product_id is a real value
    expect(container.textContent).toContain("barra-led-high-bay");

    // dimensions: length_mm is PLACEHOLDER, width_mm/height_mm are real
    expect(container.textContent).toContain("width_mm: 150");
    expect(container.textContent).toContain("height_mm: 67");

    // materials: all PLACEHOLDER → should show "Sob consulta"
    // ifc_properties: all PLACEHOLDER → should show "Sob consulta"
    // The fallback should appear (at least one)
    expect(container.textContent).toContain("Sob consulta");
  });
});
