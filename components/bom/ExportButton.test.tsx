import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildBomLines } from "@/lib/bom";
import { LocaleProvider } from "@/state/locale";
import { ExportButton } from "./ExportButton";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("ExportButton", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      value: vi.fn().mockReturnValue("blob:mock"),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  it("calls createObjectURL when CSV button is clicked", () => {
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 1 }]);
    render(<Wrapper><ExportButton lines={lines} /></Wrapper>);
    const csvBtn = screen.getByRole("button", { name: /exportar csv/i });
    fireEvent.click(csvBtn);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
