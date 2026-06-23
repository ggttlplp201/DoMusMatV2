"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { repo } from "@/lib/repository";
import { filterProducts } from "@/lib/filter";
import type { CatalogueFilters } from "@/lib/filter";
import { useT } from "@/state/locale";
import { SearchBar } from "@/components/nav/SearchBar";
import { FilterSidebar } from "./FilterSidebar";
import { SortDropdown } from "./SortDropdown";
import type { SortOption } from "./SortDropdown";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/types";

const EMPTY_FILTERS: CatalogueFilters = { category: [], power: [], ip: [], colorTemp: [] };

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const copy = [...products];
  if (sort === "name-az") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "category") return copy.sort((a, b) => a.category.localeCompare(b.category));
  return copy; // featured: original order
}

export function CatalogueView() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const t = useT();

  const [filters, setFilters] = useState<CatalogueFilters>(() => ({
    ...EMPTY_FILTERS,
    category: initialCategory ? [initialCategory] : [],
  }));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("featured");
  const [showFilters, setShowFilters] = useState(false);

  // Sync category param when URL changes
  useEffect(() => {
    const cat = searchParams.get("category");
    setFilters(prev => ({ ...prev, category: cat ? [cat] : [] }));
  }, [searchParams]);

  const allProducts = repo.getProducts();
  const filtered = filterProducts(allProducts, filters, query);
  const sorted = sortProducts(filtered, sort);

  return (
    <main className="mx-auto max-w-[1440px] px-4 sm:px-6 py-8">
      {/* Breadcrumb + results count */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-aluminium-dark">{t("cat.breadcrumb")}</p>
          <p className="text-sm text-aluminium-dark">
            <span className="font-semibold text-ink">{sorted.length}</span> {t("cat.results")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[160px] sm:w-64 sm:flex-none">
            <SearchBar value={query} onChange={setQuery} />
          </div>
          <SortDropdown value={sort} onChange={setSort} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Mobile filter toggle */}
        <div className="lg:hidden w-full">
          <button
            onClick={() => setShowFilters(v => !v)}
            aria-expanded={showFilters}
            aria-controls="mobile-filter-panel"
            className="mb-4 min-h-[44px] rounded border border-aluminium px-3 py-1.5 text-sm text-aluminium-dark"
          >
            {showFilters ? t("cat.mobileFilterOpen") : t("cat.mobileFilterClosed")}
          </button>
          <div id="mobile-filter-panel" className={showFilters ? "mb-6" : "hidden"}>
            <FilterSidebar filters={filters} onChange={setFilters} />
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <FilterSidebar filters={filters} onChange={setFilters} />
        </div>

        {/* Product grid */}
        <section className="min-w-0 flex-1">
          {sorted.length === 0 ? (
            <div className="py-20 text-center text-aluminium-dark">
              <p className="text-lg">{t("cat.noResults")}</p>
              <p className="mt-1 text-sm">{t("cat.noResultsHint")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
