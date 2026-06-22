import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildBomLines } from "@/lib/bom";
import { BomTable } from "./BomTable";

describe("BomTable", () => {
  it("renders the ref and Price on request for a known ref", () => {
    const lines = buildBomLines([{ ref: "DMJR-TP200W003", quantity: 2 }]);
    render(<BomTable lines={lines} />);
    expect(screen.getByText("DMJR-TP200W003")).toBeInTheDocument();
    expect(screen.getAllByText("Price on request").length).toBeGreaterThan(0);
  });
});
