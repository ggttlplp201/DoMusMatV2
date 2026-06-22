import { render, screen } from "@testing-library/react";
import { CompliancePanel } from "./CompliancePanel";
import { LocaleProvider } from "@/state/locale";
import { repo } from "@/lib/repository";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("CompliancePanel", () => {
  it("renders CE label and at least one Documentação a pedido chip", () => {
    const product = repo.getProduct("barra-led-high-bay");
    if (!product) throw new Error("Product barra-led-high-bay not found");

    render(<Wrapper><CompliancePanel product={product} /></Wrapper>);

    // CE should appear (as label and/or as chip value)
    const ceElements = screen.getAllByText("CE");
    expect(ceElements.length).toBeGreaterThan(0);

    // DoP and EPD are PLACEHOLDER so at least one 资料按需提供 chip should appear
    const pendentes = screen.getAllByText("资料按需提供");
    expect(pendentes.length).toBeGreaterThan(0);
  });
});
