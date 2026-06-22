"use client";
import Image from "next/image";
import Link from "next/link";
import { useLists } from "@/state/lists";
import { repo } from "@/lib/repository";
import type { Product } from "@/lib/types";

export function SavedLists() {
  const { saved, toggle } = useLists();

  if (saved.length === 0) {
    return (
      <p className="text-aluminium-dark py-8 text-center">
        Ainda não guardou produtos.
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
        const catName = cats.find((c) => c.id === p.category)?.name ?? p.category;
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
                  alt={p.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 200px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-aluminium-dark text-xs">
                  Sem imagem
                </div>
              )}
            </div>
            {/* Name */}
            <p className="font-medium text-ink leading-snug">{p.name}</p>
            {/* Category */}
            <p className="text-xs text-aluminium-dark">{catName}</p>
            {/* Actions */}
            <div className="mt-auto flex items-center justify-between gap-2">
              <Link
                href={`/products/${p.id}`}
                className="rounded border border-brand px-3 py-1 text-xs text-brand hover:bg-brand hover:text-white"
              >
                Ver produto
              </Link>
              <button
                onClick={() => toggle(p.id)}
                className="text-xs text-aluminium-dark hover:text-ink"
              >
                Remover
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
