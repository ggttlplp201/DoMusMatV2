import { render, screen } from "@testing-library/react";
import { BimDownloadsCenter } from "./BimDownloadsCenter";
import { LocaleProvider } from "@/state/locale";
import { repo } from "@/lib/repository";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("BimDownloadsCenter", () => {
  it("renders GLB download link and at least one Disponível a pedido placeholder", () => {
    const product = repo.getProduct("barra-led-high-bay");
    if (!product) throw new Error("Product barra-led-high-bay not found");

    render(<Wrapper><BimDownloadsCenter product={product} /></Wrapper>);

    // GLB asset has a real file path — should render a download <a>
    const glbLink = screen.getByRole("link", { name: /3D Model \(GLB\)/i });
    expect(glbLink).toHaveAttribute("href", "/models/high_bay_led_bar.glb");

    // IFC/RFA/PLA/DWG/etc are PLACEHOLDER — at least one "Disponível a pedido"
    const emBreves = screen.getAllByText("Disponível a pedido");
    expect(emBreves.length).toBeGreaterThan(0);
  });
});
