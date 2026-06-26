"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCatalogue } from "@/state/catalogue";
import { filterProducts } from "@/lib/filter";
import type { CatalogueFilters } from "@/lib/filter";
import { useT } from "@/state/locale";
import { FilterSidebar } from "./FilterSidebar";
import { SortDropdown } from "./SortDropdown";
import type { SortOption } from "./SortDropdown";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/types";

type Density = "spacious" | "balanced" | "dense";

const EMPTY_FILTERS: CatalogueFilters = { category: [], power: [], ip: [], colorTemp: [], format: [] };

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const copy = [...products];
  if (sort === "name-az") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "category") return copy.sort((a, b) => a.category.localeCompare(b.category));
  return copy;
}

const DENSITY_COLS: Record<Density, string> = {
  spacious: "grid-cols-1 sm:grid-cols-2",
  balanced: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  dense:    "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
};

export function CatalogueView() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const initialQuery = searchParams.get("q") ?? "";
  const t = useT();
  const repo = useCatalogue();

  const [filters, setFilters] = useState<CatalogueFilters>(() => ({
    ...EMPTY_FILTERS,
    category: initialCategory ? [initialCategory] : [],
  }));
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortOption>("featured");
  const [density, setDensity] = useState<Density>("balanced");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const cat = searchParams.get("category");
    const q = searchParams.get("q") ?? "";
    setFilters(prev => ({ ...prev, category: cat ? [cat] : [] }));
    setQuery(q);
  }, [searchParams]);

  const allProducts = repo.getProducts();
  const filtered = filterProducts(allProducts, filters, query);
  const sorted = sortProducts(filtered, sort);

  const DENSITY_OPTIONS: { value: Density; label: string }[] = [
    { value: "spacious", label: t("cat.density.spacious") },
    { value: "balanced", label: t("cat.density.balanced") },
    { value: "dense",    label: t("cat.density.dense") },
  ];

  return (
    <main className="grid grid-cols-1 lg:grid-cols-[276px_1fr] max-w-[1600px] mx-auto">
      {/* Mobile filter toggle */}
      <div className="lg:hidden px-4 pt-4">
        <button
          type="button"
          onClick={() => setShowMobileFilters(v => !v)}
          aria-expanded={showMobileFilters}
          aria-controls="mobile-filter-panel"
          className="mb-4 h-[38px] rounded border border-[#E6E5DE] px-3 text-sm text-[#3A3B40]"
        >
          {showMobileFilters ? t("cat.mobileFilterOpen") : t("cat.mobileFilterClosed")}
        </button>
        {showMobileFilters && (
          <div id="mobile-filter-panel" className="mb-6">
            <FilterSidebar filters={filters} onChange={setFilters} />
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <FilterSidebar filters={filters} onChange={setFilters} />
      </div>

      {/* Results section */}
      <section className="px-9 pt-[34px] pb-24">
        {/* Results header */}
        <div className="flex items-end justify-between gap-5 flex-wrap mb-7">
          <div>
            <p className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-[#8C8C84] mb-2">
              {t("cat.breadcrumb")}
            </p>
            <h1 className="text-[30px] font-semibold tracking-[-0.02em]">
              {t("cat.allProducts")}{" "}
              <span className="text-[#B4B4AC] font-normal">{sorted.length}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Density segmented control */}
            <div role="group" aria-label={t("cat.density.balanced")} className="flex items-center border border-[#E6E5DE] rounded overflow-hidden">
              {DENSITY_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={density === opt.value}
                  onClick={() => setDensity(opt.value)}
                  className={`px-[13px] py-2 text-[13px] cursor-pointer transition-colors ${
                    i > 0 ? "border-l border-[#E6E5DE]" : ""
                  } ${
                    density === opt.value
                      ? "bg-[#17181C] text-white"
                      : "bg-white text-[#17181C] hover:bg-[#F6F5F0]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <SortDropdown value={sort} onChange={setSort} />
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="py-20 text-center text-[#8C8C84]">
            <p className="text-lg">{t("cat.noResults")}</p>
            <p className="mt-1 text-sm">{t("cat.noResultsHint")}</p>
          </div>
        ) : (
          <div className={`grid gap-5 ${DENSITY_COLS[density]}`}>
            {sorted.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
