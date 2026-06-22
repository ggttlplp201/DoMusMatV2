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
    expect(screen.getByText("High Bay LED 灯具")).toBeInTheDocument();
    expect(screen.getByText("LED 花园柱灯")).toBeInTheDocument();
    expect(screen.getByText("功率")).toBeInTheDocument();
  });
});
