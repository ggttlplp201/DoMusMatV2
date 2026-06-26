"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGate } from "@/components/admin/AdminGate";
import { useCatalogue } from "@/state/catalogue";
import { useT, useLocale } from "@/state/locale";
import { localizedName } from "@/lib/i18n";
import { setProductStatusAction } from "./actions";

interface ProductRow {
  id: string;
  name: string;
  name_en: string;
  name_zh: string;
  category: string;
  status: "active" | "retired";
  product_variants: { ref: string }[];
}

export default function AdminProductsPage() {
  const t = useT();
  const { locale } = useLocale();
  const repo = useCatalogue();
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [fetched, setFetched] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("products")
      .select("id,name,name_en,name_zh,category,status,product_variants(ref)")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setRows((data as ProductRow[]) ?? []);
        setFetched(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const catName = (id: string) => {
    const c = repo.getCategories().find((x) => x.id === id);
    return c ? localizedName(c, locale) : id;
  };

  async function toggleStatus(row: ProductRow) {
    const next = row.status === "active" ? "retired" : "active";
    setBusyId(row.id);
    const res = await setProductStatusAction(row.id, next);
    setBusyId(null);
    if (res.ok) setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
  }

  return (
    <AdminGate title={t("admin.prod.title")}>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/products/new" className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white">
          + {t("admin.prod.add")}
        </Link>
        <Link href="/admin/products/bulk" className="rounded border border-aluminium px-4 py-2 text-sm font-medium text-ink">
          {t("admin.prod.bulk")}
        </Link>
        <Link href="/admin" className="rounded border border-aluminium px-4 py-2 text-sm font-medium text-ink">
          ← {t("admin.title")}
        </Link>
      </div>

      {!fetched ? (
        <p className="text-aluminium-dark py-8">{t("admin.prod.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-aluminium-dark py-8 text-center">{t("admin.prod.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-aluminium text-left text-xs uppercase tracking-wide text-aluminium-dark">
                <th className="py-2 pr-4">{t("admin.prod.col.name")}</th>
                <th className="py-2 pr-4">{t("admin.prod.col.category")}</th>
                <th className="py-2 pr-4 text-center">{t("admin.prod.col.variants")}</th>
                <th className="py-2 pr-4">{t("admin.prod.col.status")}</th>
                <th className="py-2 pr-4 text-right">{t("admin.prod.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-fill">
                  <td className="py-2 pr-4 font-medium text-ink">{localizedName(r, locale)}</td>
                  <td className="py-2 pr-4 text-aluminium-dark">{catName(r.category)}</td>
                  <td className="py-2 pr-4 text-center tabular-nums">{r.product_variants?.length ?? 0}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-fill text-aluminium-dark"
                      }`}
                    >
                      {r.status === "active" ? t("admin.prod.active") : t("admin.prod.retired")}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex justify-end gap-3">
                      <Link href={`/admin/products/${r.id}/edit`} className="text-ink hover:underline">
                        {t("admin.prod.edit")}
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => toggleStatus(r)}
                        className="text-aluminium-dark hover:text-ink disabled:opacity-50"
                      >
                        {r.status === "active" ? t("admin.prod.retire") : t("admin.prod.restore")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminGate>
  );
}
