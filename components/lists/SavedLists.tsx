"use client";
import Image from "next/image";
import Link from "next/link";
import { useLists } from "@/state/lists";
import { useCatalogue } from "@/state/catalogue";
import { useT, useLocale } from "@/state/locale";
import { localizedName } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export function SavedLists() {
  const { saved, toggle } = useLists();
  const t = useT();
  const { locale } = useLocale();
  const repo = useCatalogue();

  if (saved.length === 0) {
    return (
      <p className="text-aluminium-dark py-8 text-center">
        {t("lists.empty")}
      </p>
    );
  }

  const products = saved
    .map((id) => repo.getProduct(id))
    .filter((p): p is Product => p !== undefined);

  const cats = repo.getCategories();

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => {
        const cat = cats.find((c) => c.id === p.category);
        const catName = cat ? localizedName(cat, locale) : p.category;
        return (
          <li
            key={p.id}
            className="flex flex-col gap-3 rounded border border-aluminium bg-white p-4"
          >
            {/* Thumbnail */}
            <div className="relative h-32 w-full overflow-hidden rounded bg-neutral-fill">
              {p.images && p.images.length > 0 ? (
                <Image
                  src={p.images[0]}
                  alt={localizedName(p, locale)}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 200px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-aluminium-dark text-xs">
                  {t("detail.noImage")}
                </div>
              )}
            </div>
            {/* Name */}
            <p className="font-medium text-ink leading-snug">{localizedName(p, locale)}</p>
            {/* Category */}
            <p className="text-xs text-aluminium-dark">{catName}</p>
            {/* Actions */}
            <div className="mt-auto flex items-center justify-between gap-2">
              <Link
                href={`/products/${p.id}`}
                className="rounded border border-brand px-3 py-1 text-xs text-brand hover:bg-brand hover:text-white"
              >
                {t("detail.viewProduct")}
              </Link>
              <button
                onClick={() => toggle(p.id)}
                className="text-xs text-aluminium-dark hover:text-ink"
              >
                {t("common.remove")}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
