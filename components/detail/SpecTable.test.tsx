import { render, screen } from "@testing-library/react";
import { SpecTable } from "./SpecTable";
import { LocaleProvider } from "@/state/locale";
import { repo } from "@/lib/repository";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("SpecTable", () => {
  it("renders dimensions and power for the 200W high-bay variant", () => {
    const product = repo.getProduct("barra-led-high-bay");
    if (!product) throw new Error("Product barra-led-high-bay not found");
    const variant = product.variants.find((v) => v.attrs.power_w === 200);
    if (!variant) throw new Error("200W variant not found");

    render(<Wrapper><SpecTable product={product} variant={variant} /></Wrapper>);

    // Dimensions should be formatted as "1200 × 150 × 67 mm"
    expect(screen.getByText("1200 × 150 × 67 mm")).toBeInTheDocument();

    // Power value "200 W" should appear somewhere
    expect(screen.getByText("200 W")).toBeInTheDocument();
  });
});
