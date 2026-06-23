"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/state/cart";
import { useBom } from "@/state/bom";
import { useCompare } from "@/state/compare";
import { useLists } from "@/state/lists";
import { useT, useLocale } from "@/state/locale";
import { LOCALES } from "@/lib/i18n";
import { localizedName } from "@/lib/i18n";
import { repo } from "@/lib/repository";

// ─── Icons ───────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8C8C84" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="4" width="7" height="16" rx="1" />
      <rect x="14" y="4" width="7" height="11" rx="1" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BomListIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.5 12.5a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2L22 7H6" />
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

// ─── Language Switch ──────────────────────────────────────────────────────────

function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <div
      role="group"
      aria-label="Idioma / Language / 语言"
      className="flex items-center border border-hairline rounded overflow-hidden flex-none"
    >
      {LOCALES.map(({ code, label }, i) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={[
            "px-[11px] py-[7px] text-[13px] font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            i > 0 ? "border-l border-hairline" : "",
            locale === code
              ? "bg-brand text-white font-semibold"
              : "text-muted hover:text-ink hover:bg-wash",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Category nav ─────────────────────────────────────────────────────────────

function CategoryBar({ activeId }: { activeId: string | null }) {
  const categories = repo.getCategories();
  const { locale } = useLocale();
  return (
    <nav
      aria-label="产品分类"
      className="flex items-center gap-0.5 h-[52px] px-9 border-t border-hairline-light overflow-x-auto scrollbar-none"
    >
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/catalogue?category=${cat.id}`}
          className={[
            "px-[14px] py-[6px] text-[14.5px] text-body whitespace-nowrap rounded transition-colors",
            activeId === cat.id
              ? "bg-wash text-ink font-medium"
              : "hover:bg-wash hover:text-ink",
          ].join(" ")}
          aria-current={activeId === cat.id ? "page" : undefined}
        >
          {localizedName(cat, locale)}
        </Link>
      ))}
    </nav>
  );
}

function CategoryBarLive() {
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams ? searchParams.get("category") : null;
  return <CategoryBar activeId={activeCategoryId} />;
}

// ─── Mobile menu ─────────────────────────────────────────────────────────────

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
  const t = useT();
  const { locale } = useLocale();
  const categories = repo.getCategories();

  if (!open) return null;

  return (
    <div className="border-b border-hairline bg-white md:hidden">
      {/* Mobile search */}
      <div className="px-6 py-3 relative">
        <span className="absolute left-9 top-1/2 -translate-y-1/2 pointer-events-none">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("search.placeholder")}
          className="w-full h-[46px] border border-hairline bg-wash rounded pl-[42px] pr-4 text-[15px] text-ink outline-none focus:border-ink"
        />
      </div>

      {/* Categories */}
      <nav aria-label={t("nav.categories")}>
        <ul>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/catalogue?category=${cat.id}`}
                onClick={onClose}
                className="flex items-center px-6 min-h-[44px] text-sm text-body hover:text-ink hover:bg-wash"
              >
                {localizedName(cat, locale)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Actions */}
      <div className="flex flex-col gap-1 px-6 py-3 border-t border-hairline">
        <Link href="/compare" onClick={onClose} className="flex items-center gap-2 text-sm text-ink min-h-[44px]">
          <CompareIcon /> {t("nav.compare")}
        </Link>
        <Link href="/lists" onClick={onClose} className="flex items-center gap-2 text-sm text-ink min-h-[44px]">
          <BookmarkIcon /> {t("nav.savedLists")}
        </Link>
        <Link href="/materiais" onClick={onClose} className="flex items-center gap-2 text-sm text-ink min-h-[44px]">
          <BomListIcon /> {t("nav.materialList")}
        </Link>
        <button className="flex items-center rounded border border-ink px-3 min-h-[44px] text-sm text-left hover:bg-ink hover:text-white transition-colors">
          {t("nav.login")}
        </button>
        <div className="pt-2 pb-1">
          <LanguageSwitch />
        </div>
      </div>
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

export function Nav() {
  const { count } = useCart();
  const { count: bomCount } = useBom();
  const { refs } = useCompare();
  const { saved } = useLists();
  const t = useT();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      {/* Primary bar */}
      <div
        className="border-b border-hairline"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "saturate(160%) blur(8px)" }}
      >
        <div className="flex items-center gap-7 h-[74px] px-9">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-[11px] flex-none text-ink hover:opacity-80 transition-opacity"
          >
            <span
              className="block w-[18px] h-[18px] bg-brand rotate-45 rounded-sm flex-none"
              aria-hidden
            />
            <span className="text-[21px] font-bold tracking-[-0.02em]">DoMusMat</span>
          </Link>

          {/* Search — flex-1, hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-[560px] relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search.placeholder")}
              className="w-full h-[46px] border border-hairline bg-wash rounded pl-[42px] pr-4 text-[15px] text-ink outline-none focus:border-ink"
            />
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-[6px] ml-auto text-body">
            {/* Language switch — desktop */}
            <div className="hidden md:flex mr-[6px]">
              <LanguageSwitch />
            </div>

            {/* Compare */}
            <Link
              href="/compare"
              aria-label={t("nav.compare")}
              title={t("nav.compare")}
              className="relative hidden md:grid w-[38px] h-[38px] place-items-center rounded hover:bg-wash transition-colors"
            >
              <CompareIcon />
              {refs.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-brand text-white text-[10px] font-semibold rounded-full grid place-items-center leading-none">
                  {refs.length}
                </span>
              )}
            </Link>

            {/* Favorites */}
            <Link
              href="/lists"
              aria-label={t("nav.savedLists")}
              title={t("nav.savedLists")}
              className="relative hidden md:grid w-[38px] h-[38px] place-items-center rounded hover:bg-wash transition-colors"
            >
              <BookmarkIcon />
              {saved.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-brand text-white text-[10px] font-semibold rounded-full grid place-items-center leading-none">
                  {saved.length}
                </span>
              )}
            </Link>

            {/* Material list */}
            <Link
              href="/materiais"
              aria-label={t("nav.materialList")}
              title={t("nav.materialList")}
              className="relative hidden md:grid w-[38px] h-[38px] place-items-center rounded hover:bg-wash transition-colors"
            >
              <BomListIcon />
              {bomCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-brand text-white text-[10px] font-semibold rounded-full grid place-items-center leading-none">
                  {bomCount}
                </span>
              )}
            </Link>

            {/* Cart / Quote */}
            <Link
              href="/cart"
              aria-label={t("nav.quote")}
              title={t("nav.quote")}
              className="relative grid w-[38px] h-[38px] place-items-center rounded hover:bg-wash transition-colors"
            >
              <CartIcon />
              {count > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-brand text-white text-[10px] font-semibold rounded-full grid place-items-center leading-none">
                  {count}
                </span>
              )}
            </Link>

            {/* Login — desktop */}
            <button className="hidden md:inline-flex items-center ml-2 h-10 px-5 border border-ink rounded text-[14px] font-medium text-ink bg-white hover:bg-ink hover:text-white transition-colors">
              {t("nav.login")}
            </button>

            {/* Hamburger — mobile */}
            <button
              className="md:hidden grid place-items-center w-[44px] h-[44px] text-ink"
              aria-label="Menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <HamburgerIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Category nav — desktop */}
      <div
        className="hidden md:block"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "saturate(160%) blur(8px)" }}
      >
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
