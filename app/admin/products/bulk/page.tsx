"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminGate } from "@/components/admin/AdminGate";
import { useCatalogue } from "@/state/catalogue";
import { useT } from "@/state/locale";
import { parseProductCsv, IMPORT_COLUMNS, type ImportResult } from "@/lib/productImport";
import { importProductsAction } from "../actions";

const EXAMPLE_ROW = [
  "Garden Bollard", "iluminacao-led", "DMSL-12W004", "", "花园灯柱", "DMSL-",
  "Balizador exterior", "", "", "https://example.com/a.jpg", "caminhos|acessos",
  "65", "Aluminium", "AC 220-240V", "≥80", "3000K|4000K",
  "12", "240", "108", "600", "", "",
  "CE", "", "", "", "", "", "",
];

export default function BulkUploadPage() {
  const t = useT();
  const router = useRouter();
  const repo = useCatalogue();
  const [supabase] = useState(() => createClient());
  const fileRef = useRef<HTMLInputElement>(null);

  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("products")
      .select("id")
      .then(({ data }) => {
        if (!cancelled) setExistingSlugs(new Set(((data as { id: string }[]) ?? []).map((r) => r.id)));
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setDone(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const validCategories = new Set(repo.getCategories().map((c) => c.id));
    setResult(parseProductCsv(text, { validCategories, existingSlugs }));
  }

  async function doImport() {
    if (!result || result.products.length === 0) return;
    setBusy(true);
    setError(null);
    const res = await importProductsAction(result.products);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? t("admin.prod.error"));
      return;
    }
    setDone(res.count ?? result.products.length);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadTemplate() {
    const csv = IMPORT_COLUMNS.join(",") + "\n" + EXAMPLE_ROW.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "domusmat-products-template.csv";
    a.click();
    globalThis.URL.revokeObjectURL(url);
  }

  return (
    <AdminGate title={t("admin.prod.bulk.title")}>
      <div className="mb-6 flex flex-wrap gap-3">
        <button type="button" onClick={downloadTemplate} className="rounded border border-aluminium px-4 py-2 text-sm font-medium text-ink">
          ↓ {t("admin.prod.bulk.template")}
        </button>
        <button type="button" onClick={() => router.push("/admin/products")} className="rounded border border-aluminium px-4 py-2 text-sm font-medium text-ink">
          ← {t("admin.prod.title")}
        </button>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-ink">{t("admin.prod.bulk.choose")}</span>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
      </label>

      {done !== null && (
        <p className="mt-6 text-sm text-emerald-700">
          {t("admin.prod.bulk.imported")} ({done})
        </p>
      )}

      {result && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold text-ink">{t("admin.prod.bulk.preview")}</h2>
          <p className="text-sm text-aluminium-dark">
            <strong className="text-emerald-700">{result.products.length}</strong> {t("admin.prod.bulk.valid")}
            {" · "}
            <strong className={result.errors.length ? "text-red-600" : "text-ink"}>{result.errors.length}</strong>{" "}
            {t("admin.prod.bulk.errors")}
          </p>

          {result.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-red-600">
              {result.errors.map((er) => (
                <li key={er.row}>
                  #{er.row}: {er.messages.join("; ")}
                </li>
              ))}
            </ul>
          )}

          {result.products.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-ink">
              {result.products.map((p) => (
                <li key={p.id}>
                  <span className="font-medium">{p.name}</span>{" "}
                  <span className="text-aluminium-dark">
                    ({p.category} · {p.variants.length} {t("admin.prod.col.variants")})
                  </span>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={busy || result.products.length === 0}
            onClick={doImport}
            className="mt-6 rounded bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "…" : `${t("admin.prod.bulk.import")} (${result.products.length})`}
          </button>
        </section>
      )}
    </AdminGate>
  );
}
