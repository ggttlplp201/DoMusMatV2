import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";
import { LocaleProvider } from "@/state/locale";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("Footer", () => {
  it("renders without crash", () => {
    render(<Wrapper><Footer /></Wrapper>);
  });

  it("renders the tagline (ZH default)", () => {
    render(<Wrapper><Footer /></Wrapper>);
    expect(
      screen.getByText(
        "我们致力于品质、诚信与创新，以客户和可持续发展为核心。"
      )
    ).toBeDefined();
  });

  it("renders three legal links", () => {
    render(<Wrapper><Footer /></Wrapper>);
    expect(screen.getByText("隐私与 Cookie 政策")).toBeDefined();
    expect(screen.getByText("条款与条件")).toBeDefined();
    expect(screen.getByText("投诉簿")).toBeDefined();
  });

  it("renders address", () => {
    render(<Wrapper><Footer /></Wrapper>);
    expect(
      screen.getByText("Av. Dom João I, 16, 2º Direito, 2780-065 Oeiras, Portugal")
    ).toBeDefined();
  });

  it("renders BOTH phone numbers", () => {
    render(<Wrapper><Footer /></Wrapper>);
    expect(screen.getByText("+351 211 372 830")).toBeDefined();
    expect(screen.getByText(/\+351 913 521 475/)).toBeDefined();
  });

  it("renders email", () => {
    render(<Wrapper><Footer /></Wrapper>);
    expect(screen.getByText("geral@domusmat.com")).toBeDefined();
  });

  it("renders copyright with © 2026", () => {
    render(<Wrapper><Footer /></Wrapper>);
    expect(screen.getByText(/© 2026/)).toBeDefined();
  });
});
