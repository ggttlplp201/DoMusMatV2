import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders its label", () => { render(<Chip label="200W" />); expect(screen.getByText("200W")).toBeInTheDocument(); });
});
