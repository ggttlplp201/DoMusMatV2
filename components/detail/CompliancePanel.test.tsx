import { render, screen } from "@testing-library/react";
import { CompliancePanel } from "./CompliancePanel";
import { repo } from "@/lib/repository";

describe("CompliancePanel", () => {
  it("renders CE label and at least one Pendente chip", () => {
    const product = repo.getProduct("barra-led-high-bay");
    if (!product) throw new Error("Product barra-led-high-bay not found");

    render(<CompliancePanel product={product} />);

    // CE should appear (as label and/or as chip value)
    const ceElements = screen.getAllByText("CE");
    expect(ceElements.length).toBeGreaterThan(0);

    // DoP and EPD are PLACEHOLDER so at least one Pendente chip should appear
    const pendentes = screen.getAllByText("Pendente");
    expect(pendentes.length).toBeGreaterThan(0);
  });
});
