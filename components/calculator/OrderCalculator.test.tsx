import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartProvider } from "@/state/cart";
import { BomProvider } from "@/state/bom";
import { AnalyticsProvider } from "@/state/analytics";
import { OrderCalculator } from "./OrderCalculator";

describe("OrderCalculator", () => {
  it("shows placeholder strings and enabled CTA when prices are not yet set", () => {
    render(
      <AnalyticsProvider>
        <CartProvider>
          <BomProvider>
            <OrderCalculator variantRef="DMJR-TP200W003" />
          </BomProvider>
        </CartProvider>
      </AnalyticsProvider>
    );

    expect(screen.getAllByText("Preço sob consulta").length).toBeGreaterThan(0);
    expect(screen.getByText("Prazo de entrega sob consulta")).toBeInTheDocument();

    const addToQuoteBtn = screen.getByRole("button", { name: "Adicionar ao orçamento" });
    expect(addToQuoteBtn).toBeEnabled();
  });
});
