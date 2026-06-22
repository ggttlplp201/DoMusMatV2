import { render, screen } from "@testing-library/react";
import { SupplyChainTimeline } from "./SupplyChainTimeline";
import { repo } from "@/lib/repository";

describe("SupplyChainTimeline", () => {
  it("renders all four delivery stage labels", () => {
    const product = repo.getProduct("barra-led-high-bay");
    if (!product) throw new Error("Product barra-led-high-bay not found");

    render(<SupplyChainTimeline product={product} />);

    expect(screen.getByText("Produção")).toBeInTheDocument();
    expect(screen.getByText("Expedição")).toBeInTheDocument();
    expect(screen.getByText("Transporte")).toBeInTheDocument();
    expect(screen.getByText("Em obra")).toBeInTheDocument();
  });
});
