import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./ProductCard";
import { LocaleProvider } from "@/state/locale";
import { CompareProvider } from "@/state/compare";
import { AnalyticsProvider } from "@/state/analytics";
import { ListsProvider } from "@/state/lists";
import { repo } from "@/lib/repository";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

// Mock GSAP
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
  useGSAP: vi.fn((fn?: () => void, _opts?: unknown) => {
    const contextSafe = vi.fn((cb: (...args: unknown[]) => unknown) => cb);
    if (typeof fn === "function") {
      try { fn(); } catch { /* ignore */ }
    }
    return { contextSafe };
  }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AnalyticsProvider>
        <CompareProvider>
          <ListsProvider>
            {children}
          </ListsProvider>
        </CompareProvider>
      </AnalyticsProvider>
    </LocaleProvider>
  );
}

describe("ProductCard", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("with barra-led-high-bay (has 3D model)", () => {
    const product = repo.getProduct("barra-led-high-bay")!;

    it("renders the 查看 3D badge button", () => {
      render(<Wrapper><ProductCard product={product} /></Wrapper>);
      expect(screen.getByRole("button", { name: /查看 3D/i })).toBeDefined();
    });

    it("card link points to /products/barra-led-high-bay", () => {
      render(<Wrapper><ProductCard product={product} /></Wrapper>);
      const links = screen.getAllByRole("link");
      // The card outer Link
      const cardLink = links.find(l => l.getAttribute("href") === "/products/barra-led-high-bay");
      expect(cardLink).toBeDefined();
    });

    it("renders compare button", () => {
      render(<Wrapper><ProductCard product={product} /></Wrapper>);
      const compareBtn = screen.getByRole("button", { name: /对比|Compare|Comparar/i });
      expect(compareBtn).toBeDefined();
    });
  });

  describe("with a non-lighting product", () => {
    const products = repo.getProducts();
    const nonLighting = products.find(p => p.category !== "iluminacao") ?? products[0];

    it("renders product name", () => {
      render(<Wrapper><ProductCard product={nonLighting} /></Wrapper>);
      // Product name should appear in the card
      expect(screen.getByRole("heading")).toBeDefined();
    });
  });
});
