import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LocaleToggle } from "./LocaleToggle";
import { LocaleProvider, useLocale } from "@/state/locale";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("LocaleToggle", () => {
  it("renders PT, EN and 中文 buttons", () => {
    render(
      <Wrapper>
        <LocaleToggle />
      </Wrapper>
    );
    expect(screen.getByRole("button", { name: "PT" })).toBeDefined();
    expect(screen.getByRole("button", { name: "EN" })).toBeDefined();
    expect(screen.getByRole("button", { name: "中文" })).toBeDefined();
  });

  it("PT button has aria-pressed=true by default", () => {
    render(
      <Wrapper>
        <LocaleToggle />
      </Wrapper>
    );
    const ptBtn = screen.getByRole("button", { name: "PT" });
    expect(ptBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking 中文 sets aria-pressed=true on 中文 button", () => {
    render(
      <Wrapper>
        <LocaleToggle />
      </Wrapper>
    );
    const zhBtn = screen.getByRole("button", { name: "中文" });
    fireEvent.click(zhBtn);
    expect(zhBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking EN button makes EN aria-pressed=true", () => {
    render(
      <Wrapper>
        <LocaleToggle />
      </Wrapper>
    );
    const enBtn = screen.getByRole("button", { name: "EN" });
    fireEvent.click(enBtn);
    expect(enBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("group has aria-label containing Language", () => {
    render(
      <Wrapper>
        <LocaleToggle />
      </Wrapper>
    );
    const group = screen.getByRole("group");
    expect(group.getAttribute("aria-label")).toContain("Language");
  });
});
