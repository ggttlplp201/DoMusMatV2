import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildBomLines } from "@/lib/bom";
import { BomTable } from "./BomTable";

describe("BomTable", () => {
  it("renders the ref and Preço sob consulta for a known ref", () => {
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 2 }]);
    render(<BomTable lines={lines} />);
    expect(screen.getByText("DMJR-TP200W003")).toBeInTheDocument();
    expect(screen.getAllByText("Preço sob consulta").length).toBeGreaterThan(0);
  });

  it("calls onRemove with the row ref when the remove button is clicked", () => {
    const onRemove = vi.fn();
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 2 }]);
    render(<BomTable lines={lines} onRemove={onRemove} />);
    const removeBtn = screen.getByRole("button", { name: /Remover DMJR-TP200W003/i });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith("DMJR-TP200W003");
  });

  it("does not render remove buttons when onRemove is not provided", () => {
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 2 }]);
    render(<BomTable lines={lines} />);
    expect(screen.queryByRole("button", { name: /Remover/i })).toBeNull();
  });
});
