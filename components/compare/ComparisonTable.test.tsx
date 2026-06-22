import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparisonTable } from "./ComparisonTable";

describe("ComparisonTable", () => {
  it("renders both product names and the Potência row label", () => {
    render(
      <ComparisonTable
        productIds={["barra-led-high-bay", "balizador-de-jardim-led"]}
      />
    );
    expect(screen.getByText("Barra LED High Bay")).toBeInTheDocument();
    expect(screen.getByText("Balizador de Jardim LED")).toBeInTheDocument();
    expect(screen.getByText("Potência")).toBeInTheDocument();
  });
});
