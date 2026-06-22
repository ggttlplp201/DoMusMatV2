import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DownloadMenu } from "./DownloadMenu";
import { LocaleProvider } from "@/state/locale";
import { repo } from "@/lib/repository";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("DownloadMenu", () => {
  const product = repo.getProduct("barra-led-high-bay")!;

  it("renders the Descarregar trigger button (PT default)", () => {
    render(<Wrapper><DownloadMenu product={product} /></Wrapper>);
    expect(screen.getByRole("button", { name: /descarregar/i })).toBeDefined();
  });

  it("menu is closed initially — format groups not in document", () => {
    render(<Wrapper><DownloadMenu product={product} /></Wrapper>);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByText(/Compatível com Revit/i)).toBeNull();
  });

  it("clicking the trigger opens the menu and shows Revit & ArchiCAD group (PT)", () => {
    render(<Wrapper><DownloadMenu product={product} /></Wrapper>);
    const btn = screen.getByRole("button", { name: /descarregar/i });
    fireEvent.click(btn);
    expect(screen.getByRole("menu")).toBeDefined();
    expect(screen.getByText(/Compatível com Revit & ArchiCAD/i)).toBeDefined();
  });

  it("shows 'Disponível a pedido' for IFC/RFA placeholder assets (PT)", () => {
    render(<Wrapper><DownloadMenu product={product} /></Wrapper>);
    fireEvent.click(screen.getByRole("button", { name: /descarregar/i }));
    const pendingItems = screen.getAllByText("Disponível a pedido");
    expect(pendingItems.length).toBeGreaterThan(0);
  });

  it("shows GLB download link with correct href", () => {
    render(<Wrapper><DownloadMenu product={product} /></Wrapper>);
    fireEvent.click(screen.getByRole("button", { name: /descarregar/i }));
    // The GLB asset has a real file — find the anchor by its text (size label)
    const link = screen.getByText("2.4 MB").closest("a");
    expect(link).toBeDefined();
    expect(link!.getAttribute("href")).toBe("/models/high_bay_led_bar.glb");
    expect(link!.hasAttribute("download")).toBe(true);
  });

  it("closes the menu when clicking the trigger again", () => {
    render(<Wrapper><DownloadMenu product={product} /></Wrapper>);
    const btn = screen.getByRole("button", { name: /descarregar/i });
    fireEvent.click(btn);
    expect(screen.getByRole("menu")).toBeDefined();
    fireEvent.click(btn);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("trigger has aria-haspopup=menu and aria-expanded", () => {
    render(<Wrapper><DownloadMenu product={product} /></Wrapper>);
    const btn = screen.getByRole("button", { name: /descarregar/i });
    expect(btn.getAttribute("aria-haspopup")).toBe("menu");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
});
