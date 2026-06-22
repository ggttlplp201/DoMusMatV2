import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Gallery } from "./Gallery";
import { LocaleProvider } from "@/state/locale";
import { repo } from "@/lib/repository";

// Mock GSAP to avoid animation side-effects in jsdom
vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    fromTo: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
    set: vi.fn(),
    context: vi.fn(() => ({ revert: vi.fn(), add: vi.fn() })),
  },
}));

vi.mock("@gsap/react", () => ({
  useGSAP: vi.fn((fn: () => void) => {
    // Run the callback synchronously so dependencies/refs work — but gsap.fromTo is mocked
    try { fn(); } catch { /* ignore */ }
  }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("Gallery", () => {
  describe("with roupeiro (5 images)", () => {
    const product = repo.getProduct("roupeiro")!;

    it("product has 5 images", () => {
      expect(product.images.length).toBe(5);
    });

    it("renders prev and next arrow buttons", () => {
      render(
        <Wrapper>
          <Gallery images={product.images} alt={product.name} />
        </Wrapper>
      );
      expect(screen.getByRole("button", { name: "上一张" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "下一张" })).toBeInTheDocument();
    });

    it("clicking next advances the main image src", () => {
      render(
        <Wrapper>
          <Gallery images={product.images} alt={product.name} />
        </Wrapper>
      );

      // The main image is the first <img> with alt = product.name (not thumbnails)
      const mainImg = screen.getAllByAltText(product.name)[0] as HTMLImageElement;
      const initialSrc = mainImg.getAttribute("src") ?? mainImg.src;

      const nextBtn = screen.getByRole("button", { name: "下一张" });
      fireEvent.click(nextBtn);

      // After clicking next the src should have changed
      const newSrc = mainImg.getAttribute("src") ?? mainImg.src;
      expect(newSrc).not.toBe(initialSrc);
    });

    it("renders thumbnail strip", () => {
      render(
        <Wrapper>
          <Gallery images={product.images} alt={product.name} />
        </Wrapper>
      );
      // Thumbnails are buttons with aria-label "Imagem 1" … "Imagem 5"
      expect(screen.getByRole("button", { name: "Imagem 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Imagem 5" })).toBeInTheDocument();
    });
  });

  describe("with 1-image product", () => {
    const singleImage = ["https://domusmat.pt/wp-content/uploads/2025/07/single.jpg"];

    it("does NOT render prev/next arrows", () => {
      render(
        <Wrapper>
          <Gallery images={singleImage} alt="Produto" />
        </Wrapper>
      );
      expect(screen.queryByRole("button", { name: "Imagem anterior" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Imagem seguinte" })).toBeNull();
    });
  });

  describe("with 0-image product", () => {
    it("does NOT render prev/next arrows", () => {
      render(
        <Wrapper>
          <Gallery images={[]} alt="Produto" />
        </Wrapper>
      );
      expect(screen.queryByRole("button", { name: "Imagem anterior" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Imagem seguinte" })).toBeNull();
    });
  });
});
