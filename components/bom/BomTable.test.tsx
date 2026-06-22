import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildBomLines } from "@/lib/bom";
import { LocaleProvider } from "@/state/locale";
import { BomTable } from "./BomTable";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("BomTable", () => {
  it("renders the ref and Preço sob consulta for a known ref", () => {
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 2 }]);
    render(<Wrapper><BomTable lines={lines} /></Wrapper>);
    expect(screen.getByText("DMJR-TP200W003")).toBeInTheDocument();
    expect(screen.getAllByText("Preço sob consulta").length).toBeGreaterThan(0);
  });

  it("calls onRemove with the row ref when the remove button is clicked", () => {
    const onRemove = vi.fn();
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 2 }]);
    render(<Wrapper><BomTable lines={lines} onRemove={onRemove} /></Wrapper>);
    const removeBtn = screen.getByRole("button", { name: /Remover DMJR-TP200W003/i });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith("DMJR-TP200W003");
  });

  it("does not render remove buttons when onRemove is not provided", () => {
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 2 }]);
    render(<Wrapper><BomTable lines={lines} /></Wrapper>);
    expect(screen.queryByRole("button", { name: /Remover/i })).toBeNull();
  });
});
