import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartProvider } from "@/state/cart";
import { BomProvider } from "@/state/bom";
import { AnalyticsProvider } from "@/state/analytics";
import { LocaleProvider } from "@/state/locale";
import { OrderCalculator } from "./OrderCalculator";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AnalyticsProvider>
        <CartProvider>
          <BomProvider>
            {children}
          </BomProvider>
        </CartProvider>
      </AnalyticsProvider>
    </LocaleProvider>
  );
}

describe("OrderCalculator", () => {
  it("shows placeholder strings and enabled CTA when prices are not yet set", () => {
    render(
      <Providers>
        <OrderCalculator variantRef="DMJR-TP200W003" />
      </Providers>
    );

    // PT default: "Preço sob consulta"
    expect(screen.getAllByText("Preço sob consulta").length).toBeGreaterThan(0);
    expect(screen.getByText("Prazo de entrega sob consulta")).toBeInTheDocument();

    const addToQuoteBtn = screen.getByRole("button", { name: "Adicionar ao orçamento" });
    expect(addToQuoteBtn).toBeEnabled();
  });
});
