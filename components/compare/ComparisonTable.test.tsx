import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/state/locale";
import { ComparisonTable } from "./ComparisonTable";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("ComparisonTable", () => {
  it("renders both product names and the Potência row label", () => {
    render(
      <Wrapper>
        <ComparisonTable
          productIds={["barra-led-high-bay", "balizador-de-jardim-led"]}
        />
      </Wrapper>
    );
    expect(screen.getByText("Barra LED High Bay")).toBeInTheDocument();
    expect(screen.getByText("Balizador de Jardim LED")).toBeInTheDocument();
    expect(screen.getByText("Potência")).toBeInTheDocument();
  });
});
