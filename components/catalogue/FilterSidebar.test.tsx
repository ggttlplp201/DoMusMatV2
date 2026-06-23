import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterSidebar } from "./FilterSidebar";
import { LocaleProvider } from "@/state/locale";
import type { CatalogueFilters } from "@/lib/filter";
import { repo } from "@/lib/repository";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

const EMPTY: CatalogueFilters = { category: [], power: [], ip: [], colorTemp: [], format: [] };

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("FilterSidebar", () => {
  it("renders the filters heading", () => {
    render(
      <Wrapper>
        <FilterSidebar filters={EMPTY} onChange={() => {}} />
      </Wrapper>
    );
    // Should show "筛选" or "Filters" or "Filtros"
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeDefined();
  });

  it("renders format chips (IFC, RFA, DWG, SKP, PDF)", () => {
    render(
      <Wrapper>
        <FilterSidebar filters={EMPTY} onChange={() => {}} />
      </Wrapper>
    );
    expect(screen.getByRole("button", { name: "IFC" })).toBeDefined();
    expect(screen.getByRole("button", { name: "RFA" })).toBeDefined();
    expect(screen.getByRole("button", { name: "DWG" })).toBeDefined();
    expect(screen.getByRole("button", { name: "SKP" })).toBeDefined();
    expect(screen.getByRole("button", { name: "PDF" })).toBeDefined();
  });

  it("toggling a format chip calls onChange with updated format array", () => {
    const onChange = vi.fn();
    render(
      <Wrapper>
        <FilterSidebar filters={EMPTY} onChange={onChange} />
      </Wrapper>
    );
    const ifcBtn = screen.getByRole("button", { name: "IFC" });
    fireEvent.click(ifcBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ format: ["IFC"] })
    );
  });

  it("clear button appears when a filter is active", () => {
    const filters: CatalogueFilters = { ...EMPTY, format: ["IFC"] };
    render(
      <Wrapper>
        <FilterSidebar filters={filters} onChange={() => {}} />
      </Wrapper>
    );
    // Clear button should be visible
    const clearBtn = screen.getByRole("button", { name: /清除|Clear|Limpar/i });
    expect(clearBtn).toBeDefined();
  });

  it("clear button does not appear when no filters are active", () => {
    render(
      <Wrapper>
        <FilterSidebar filters={EMPTY} onChange={() => {}} />
      </Wrapper>
    );
    expect(screen.queryByRole("button", { name: /清除|Clear|Limpar/i })).toBeNull();
  });

  it("clicking clear button calls onChange with empty filters", () => {
    const onChange = vi.fn();
    const filters: CatalogueFilters = { ...EMPTY, format: ["IFC"] };
    render(
      <Wrapper>
        <FilterSidebar filters={filters} onChange={onChange} />
      </Wrapper>
    );
    const clearBtn = screen.getByRole("button", { name: /清除|Clear|Limpar/i });
    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ format: [], category: [], power: [], ip: [], colorTemp: [] })
    );
  });

  it("category filters use real checkboxes (input[type=checkbox])", () => {
    render(
      <Wrapper>
        <FilterSidebar filters={EMPTY} onChange={() => {}} />
      </Wrapper>
    );
    // Should have real checkbox inputs
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("checking a category checkbox calls onChange with that category", () => {
    const onChange = vi.fn();
    render(
      <Wrapper>
        <FilterSidebar filters={EMPTY} onChange={onChange} />
      </Wrapper>
    );
    const checkboxes = screen.getAllByRole("checkbox");
    // Click the first category checkbox
    fireEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledOnce();
    // The call should include a non-empty category array
    const arg = onChange.mock.calls[0][0] as CatalogueFilters;
    expect(arg.category.length).toBe(1);
  });

  it("checked category checkbox reflects checked state", () => {
    const categories = repo.getCategories();
    const firstCatId = categories[0].id;
    const filters: CatalogueFilters = { ...EMPTY, category: [firstCatId] };
    render(
      <Wrapper>
        <FilterSidebar filters={filters} onChange={() => {}} />
      </Wrapper>
    );
    const checkboxes = screen.getAllByRole("checkbox");
    // First checkbox should be checked
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
  });
});
