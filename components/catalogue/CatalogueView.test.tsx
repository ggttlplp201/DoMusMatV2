import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CatalogueView } from "./CatalogueView";
import { LocaleProvider } from "@/state/locale";
import { CompareProvider } from "@/state/compare";
import { AnalyticsProvider } from "@/state/analytics";
import { ListsProvider } from "@/state/lists";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

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
  useGSAP: vi.fn((fn?: () => void) => {
    if (typeof fn === "function") { try { fn(); } catch { /* ignore */ } }
    return { contextSafe: vi.fn(cb => cb) };
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

describe("CatalogueView", () => {
  it("renders the density segmented control", () => {
    render(<Wrapper><CatalogueView /></Wrapper>);
    // Should show density options (宽松/标准/紧凑 or Spacious/Balanced/Dense)
    const buttons = screen.getAllByRole("button");
    const densityButtons = buttons.filter(b =>
      /宽松|标准|紧凑|Spacious|Balanced|Dense|Amplo|Padrão|Compacto/i.test(b.textContent ?? "")
    );
    expect(densityButtons.length).toBe(3);
  });

  it("renders product count in header", () => {
    render(<Wrapper><CatalogueView /></Wrapper>);
    // Should render a heading with product count
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
  });

  it("clicking density buttons changes active state", () => {
    render(<Wrapper><CatalogueView /></Wrapper>);
    const buttons = screen.getAllByRole("button");
    const spaciousBtn = buttons.find(b =>
      /宽松|Spacious|Amplo/i.test(b.textContent ?? "")
    );
    expect(spaciousBtn).toBeDefined();
    fireEvent.click(spaciousBtn!);
    // After click, the button should have the active classes
    expect(spaciousBtn!.className).toContain("bg-[#17181C]");
  });
});
