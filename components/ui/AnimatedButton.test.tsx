import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnimatedButton } from "./AnimatedButton";

describe("AnimatedButton", () => {
  it("renders children", () => {
    render(<AnimatedButton>Click me</AnimatedButton>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const fn = vi.fn();
    render(<AnimatedButton onClick={fn}>Press</AnimatedButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is passed", () => {
    render(<AnimatedButton disabled>Nope</AnimatedButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("forwards className to the button element", () => {
    render(<AnimatedButton className="my-class">Styled</AnimatedButton>);
    expect(screen.getByRole("button")).toHaveClass("my-class");
  });
});
