"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/state/cart";
import { useCompare } from "@/state/compare";
import { repo } from "@/lib/repository";
import { t } from "@/lib/strings";
import { SearchBar } from "./SearchBar";

export function Nav() {
  const { count } = useCart();
  const { refs } = useCompare();
  const categories = repo.getCategories();
  const [search, setSearch] = useState("");

  return (
    <header className="sticky top-0 z-40 border-b border-aluminium bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-ink">
          <span className="inline-block h-4 w-4 rotate-45 bg-brand" aria-hidden /> DoMusMat
        </Link>
        <nav className="hidden gap-4 text-sm text-aluminium-dark md:flex" aria-label="Categorias">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/?category=${cat.id}`}
              className="rounded px-2 py-1 hover:bg-neutral-fill hover:text-ink"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="w-48 md:w-64">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <Link href="/compare" className="text-sm">
          {t.compare} ({refs.length})
        </Link>
        <Link href="/lists" className="text-sm">
          {t.savedLists}
        </Link>
        <button className="rounded border border-aluminium px-3 py-1.5 text-sm">B2B Login</button>
        <Link href="/cart" aria-label="Orçamento" className="relative">
          🛒{count > 0 && (
            <span className="absolute -right-2 -top-2 rounded-full bg-brand px-1.5 text-xs text-white">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
