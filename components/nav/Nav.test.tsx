import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import { Nav } from "./Nav";
import { CartProvider } from "@/state/cart";
import { CompareProvider } from "@/state/compare";

describe("Nav", () => {
  it("renders without crash", () => {
    render(
      <CartProvider>
        <CompareProvider>
          <Nav />
        </CompareProvider>
      </CartProvider>
    );
  });
});
