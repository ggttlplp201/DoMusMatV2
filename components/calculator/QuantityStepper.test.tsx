import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LocaleProvider } from "@/state/locale";
import { QuantityStepper } from "./QuantityStepper";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("QuantityStepper", () => {
  it("does not call onChange below min when clicking decrement at min value", () => {
    const onChange = vi.fn();
    render(
      <Wrapper>
        <QuantityStepper value={5} min={5} onChange={onChange} />
      </Wrapper>
    );
    // ZH default: "减少数量"
    const decrementBtn = screen.getByRole("button", { name: "减少数量" });
    fireEvent.click(decrementBtn);
    expect(onChange).not.toHaveBeenCalled();
  });
});
