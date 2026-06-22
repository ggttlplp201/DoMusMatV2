import { render, screen } from "@testing-library/react";
import { BimDownloadsCenter } from "./BimDownloadsCenter";
import { repo } from "@/lib/repository";

describe("BimDownloadsCenter", () => {
  it("renders GLB download link and at least one Em breve placeholder", () => {
    const product = repo.getProduct("barra-led-high-bay");
    if (!product) throw new Error("Product barra-led-high-bay not found");

    render(<BimDownloadsCenter product={product} />);

    // GLB asset has a real file path — should render a download <a>
    const glbLink = screen.getByRole("link", { name: /3D Model \(GLB\)/i });
    expect(glbLink).toHaveAttribute("href", "/models/high_bay_led_bar.glb");

    // IFC/RFA/PLA/DWG/etc are PLACEHOLDER — at least one "Em breve"
    const emBreves = screen.getAllByText("Em breve");
    expect(emBreves.length).toBeGreaterThan(0);
  });
});
