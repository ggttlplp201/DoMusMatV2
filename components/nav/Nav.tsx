"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/state/cart";
import { useBom } from "@/state/bom";
import { useCompare } from "@/state/compare";
import { useLists } from "@/state/lists";
import { repo } from "@/lib/repository";
import { SearchBar } from "./SearchBar";
import { t } from "@/lib/strings";

// Single shared markup for both fallback (activeId=null) and live render
function CategoryBar({ activeId }: { activeId: string | null }) {
  const categories = repo.getCategories();
  return (
    <div className="border-b border-aluminium bg-white">
      <div className="mx-auto max-w-[1440px] px-6">
        <ul className="flex items-center overflow-x-auto" role="list">
          {categories.map((cat, idx) => {
            const isActive = activeId === cat.id;
            return (
              <li key={cat.id} role="listitem" className="flex items-center">
                {idx > 0 && (
                  <span className="h-4 border-l border-aluminium" aria-hidden />
                )}
                <Link
                  href={`/?category=${cat.id}`}
                  className={[
                    "px-4 py-2.5 text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "border-b-2 border-brand text-ink font-medium"
                      : "text-aluminium-dark hover:text-ink",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {cat.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// Reads searchParams (must be inside Suspense boundary)
function CategoryBarLive() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategoryId = pathname === "/" ? searchParams.get("category") : null;
  return <CategoryBar activeId={activeCategoryId} />;
}

// Mobile menu panel
function MobileMenu({
  open,
  search,
  onSearchChange,
  onClose,
}: {
  open: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onClose: () => void;
}) {
  const categories = repo.getCategories();

  if (!open) return null;

  return (
    <div className="border-b border-aluminium bg-white md:hidden">
      <div className="px-6 py-3">
        <SearchBar value={search} onChange={onSearchChange} />
      </div>
      <nav aria-label="Categorias (menu mobile)">
        <ul>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/?category=${cat.id}`}
                onClick={onClose}
                className="block px-6 py-2.5 text-sm text-aluminium-dark hover:text-ink hover:bg-neutral-fill"
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-2 px-6 py-3 border-t border-aluminium">
        <Link href="/compare" onClick={onClose} className="flex items-center gap-2 text-sm text-ink py-1">
          <CompareIcon /> {t.compare}
        </Link>
        <Link href="/lists" onClick={onClose} className="flex items-center gap-2 text-sm text-ink py-1">
          <BookmarkIcon /> {t.savedLists}
        </Link>
        <Link href="/materiais" onClick={onClose} className="flex items-center gap-2 text-sm text-ink py-1">
          <BomListIcon /> Lista de materiais
        </Link>
        <button className="rounded border border-aluminium px-3 py-1.5 text-sm text-left">
          B2B Login
        </button>
      </div>
    </div>
  );
}

function CompareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="3" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="white" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 2h8a1 1 0 011 1v10l-5-3-5 3V3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2 2h2l2.5 9h8l2-6H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="14.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

function BomListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="14" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 6h6M7 10h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Nav() {
  const { count } = useCart();
  const { count: bomCount } = useBom();
  const { refs } = useCompare();
  const { saved } = useLists();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      {/* Primary bar */}
      <div className="border-b border-aluminium bg-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-ink flex-shrink-0">
            <span className="inline-block h-4 w-4 rotate-45 bg-brand" aria-hidden />
            DoMusMat
          </Link>

          {/* SearchBar — center, hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-md mx-auto">
            <SearchBar value={search} onChange={setSearch} />
          </div>


          {/* Right cluster */}
          <div className="flex items-center gap-4 ml-auto md:ml-0">
            {/* Comparar */}
            <Link
              href="/compare"
              aria-label="Comparar produtos"
              title="Comparar"
              className="relative hidden md:flex items-center text-aluminium-dark hover:text-ink"
            >
              <CompareIcon />
              {refs.length > 0 && (
                <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] text-white leading-4">
                  {refs.length}
                </span>
              )}
            </Link>

            {/* Listas */}
            <Link
              href="/lists"
              aria-label="Listas guardadas"
              title="Listas"
              className="relative hidden md:flex items-center text-aluminium-dark hover:text-ink"
            >
              <BookmarkIcon />
              {saved.length > 0 && (
                <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] text-white leading-4">
                  {saved.length}
                </span>
              )}
            </Link>

            {/* Lista de materiais */}
            <Link
              href="/materiais"
              aria-label="Lista de materiais"
              title="Lista de materiais"
              className="relative hidden md:flex items-center text-aluminium-dark hover:text-ink"
            >
              <BomListIcon />
              {bomCount > 0 && (
                <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] text-white leading-4">
                  {bomCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label="Orçamento"
              title="Orçamento"
              className="relative flex items-center text-ink"
            >
              <CartIcon />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 rounded-full bg-brand px-1.5 text-[10px] text-white leading-4">
                  {count}
                </span>
              )}
            </Link>

            {/* B2B Login — desktop */}
            <button className="hidden md:inline-flex rounded border border-aluminium px-3 py-1.5 text-sm text-ink hover:border-ink transition-colors">
              B2B Login
            </button>

            {/* Hamburger — mobile */}
            <button
              className="md:hidden flex items-center text-ink"
              aria-label="Menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <HamburgerIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary category bar — desktop only */}
      <div className="hidden md:block">
        <Suspense fallback={<CategoryBar activeId={null} />}>
          <CategoryBarLive />
        </Suspense>
      </div>

      {/* Mobile menu */}
      <MobileMenu
        open={mobileOpen}
        search={search}
        onSearchChange={setSearch}
        onClose={() => setMobileOpen(false)}
      />
    </header>
  );
}

