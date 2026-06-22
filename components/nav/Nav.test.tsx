import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav } from "./Nav";
import { CartProvider } from "@/state/cart";
import { BomProvider } from "@/state/bom";
import { CompareProvider } from "@/state/compare";
import { ListsProvider } from "@/state/lists";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <BomProvider>
        <CompareProvider>
          <ListsProvider>
            {children}
          </ListsProvider>
        </CompareProvider>
      </BomProvider>
    </CartProvider>
  );
}

describe("Nav", () => {
  it("renders without crash", () => {
    render(
      <Providers>
        <Nav />
      </Providers>
    );
  });

  it("renders the DoMusMat logo link", () => {
    render(
      <Providers>
        <Nav />
      </Providers>
    );
    expect(screen.getByText("DoMusMat")).toBeDefined();
  });

  it("renders the cart link with aria-label Orçamento", () => {
    render(
      <Providers>
        <Nav />
      </Providers>
    );
    expect(screen.getByLabelText("Orçamento")).toBeDefined();
  });

  it("renders B2B Login button", () => {
    render(
      <Providers>
        <Nav />
      </Providers>
    );
    expect(screen.getAllByText("B2B Login").length).toBeGreaterThan(0);
  });
});
