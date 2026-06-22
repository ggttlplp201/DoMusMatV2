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

    // ZH default: "价格面议"
    expect(screen.getAllByText("价格面议").length).toBeGreaterThan(0);
    expect(screen.getByText("交期面议")).toBeInTheDocument();

    const addToQuoteBtn = screen.getByRole("button", { name: "加入报价单" });
    expect(addToQuoteBtn).toBeEnabled();
  });
});
