"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCatalogue } from "@/state/catalogue";
import { useT, useLocale } from "@/state/locale";
import { localizedName } from "@/lib/i18n";
import { slugify } from "@/lib/slug";
import { upsertProductAction } from "@/app/admin/products/actions";
import type { ImportedProduct, ComplianceKey } from "@/lib/productImport";
import type { Product } from "@/lib/types";

const COMPLIANCE_KEYS: ComplianceKey[] = ["ce", "dop", "euroclass", "voc", "epd", "acoustic", "dpp"];
const SPEC_KEYS = ["ip_rating", "material", "voltage", "cri", "color_temperature"] as const;
const VARIANT_NUM = ["power_w", "lumens", "diameter_mm", "height_mm", "length_mm", "width_mm"] as const;

interface VariantDraft {
  ref: string;
  attrs: Record<string, string>;
}

interface Draft {
  name: string;
  name_en: string;
  name_zh: string;
  category: string;
  ref_prefix: string;
  description_pt: string;
  description_en: string;
  description_zh: string;
  images: string; // | -separated
  applications: string; // | -separated
  specs: Record<string, string>;
  compliance: Record<string, string>;
  variants: VariantDraft[];
}

function draftFromProduct(p: Product): Draft {
  return {
    name: p.name,
    name_en: p.name_en,
    name_zh: p.name_zh,
    category: p.category,
    ref_prefix: p.ref_prefix,
    description_pt: p.description_pt,
    description_en: p.description_en,
    description_zh: p.description_zh,
    images: p.images.join("|"),
    applications: p.applications.join("|"),
    specs: Object.fromEntries(
      SPEC_KEYS.map((k) => {
        const v = (p.shared_specs as Record<string, unknown>)[k];
        return [k, v == null ? "" : Array.isArray(v) ? v.join("|") : String(v)];
      }),
    ),
    compliance: Object.fromEntries(
      COMPLIANCE_KEYS.map((k) => {
        const v = p.compliance?.[k]?.value;
        return [k, v && v !== "PLACEHOLDER" ? v : ""];
      }),
    ),
    variants: p.variants.map((v) => ({
      ref: v.ref,
      attrs: Object.fromEntries(VARIANT_NUM.map((k) => [k, v.attrs?.[k] == null ? "" : String(v.attrs[k])])),
    })),
  };
}

const emptyDraft = (): Draft => ({
  name: "",
  name_en: "",
  name_zh: "",
  category: "",
  ref_prefix: "",
  description_pt: "",
  description_en: "",
  description_zh: "",
  images: "",
  applications: "",
  specs: {},
  compliance: {},
  variants: [{ ref: "", attrs: {} }],
});

const splitList = (s: string) => s.split("|").map((x) => x.trim()).filter(Boolean);

function buildPayload(d: Draft, initial?: Product): ImportedProduct {
  const shared_specs: Record<string, unknown> = {};
  for (const k of SPEC_KEYS) {
    const raw = (d.specs[k] ?? "").trim();
    if (!raw) continue;
    if (k === "ip_rating") shared_specs[k] = Number(raw);
    else if (k === "color_temperature") shared_specs[k] = splitList(raw);
    else shared_specs[k] = raw;
  }

  const compliance = Object.fromEntries(
    COMPLIANCE_KEYS.map((k) => {
      const v = (d.compliance[k] ?? "").trim();
      const document = initial?.compliance?.[k]?.document ?? "PLACEHOLDER";
      return [k, v ? { status: "declared", value: v, document } : { status: "PLACEHOLDER", value: "PLACEHOLDER", document: "PLACEHOLDER" }];
    }),
  ) as ImportedProduct["compliance"];

  const variants = d.variants
    .filter((v) => v.ref.trim())
    .map((v) => {
      const attrs: Record<string, number | string> = {};
      for (const k of VARIANT_NUM) {
        const raw = (v.attrs[k] ?? "").trim();
        if (raw && !Number.isNaN(Number(raw))) attrs[k] = Number(raw);
      }
      return { ref: v.ref.trim(), attrs };
    });

  const id = initial?.id ?? slugify(d.name);

  return {
    id,
    category: d.category,
    name: d.name.trim(),
    name_en: d.name_en.trim(),
    name_zh: d.name_zh.trim(),
    ref_prefix: d.ref_prefix.trim(),
    description_pt: d.description_pt,
    description_en: d.description_en,
    description_zh: d.description_zh,
    applications: splitList(d.applications),
    images: splitList(d.images),
    shared_specs,
    model3d: initial?.model3d ?? "PLACEHOLDER",
    compliance,
    // preserve rich blocks the lean form doesn't edit
    bim_assets: initial?.bim_assets ?? [],
    bim_metadata: initial?.bim_metadata ?? {},
    standardization: initial?.standardization ?? {},
    supply_chain: initial?.supply_chain ?? {},
    status: (initial as { status?: string } | undefined)?.status === "retired" ? "retired" : "active",
    variants,
  };
}

const inputCls =
  "w-full rounded border border-aluminium bg-white px-3 py-2 text-sm text-ink focus:border-ink outline-none";
const labelCls = "block text-xs font-medium text-aluminium-dark mb-1";

export function ProductForm({ initial }: { initial?: Product }) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const repo = useCatalogue();
  const categories = repo.getCategories();

  const [d, setD] = useState<Draft>(initial ? draftFromProduct(initial) : emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const setVariant = (i: number, patch: Partial<VariantDraft>) =>
    setD((prev) => ({ ...prev, variants: prev.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));
  const setVariantAttr = (i: number, key: string, value: string) =>
    setVariant(i, { attrs: { ...d.variants[i].attrs, [key]: value } });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!d.name.trim()) return setError(t("admin.prod.f.nameReq"));
    if (!d.category) return setError(t("admin.prod.f.nameReq"));
    if (!d.variants.some((v) => v.ref.trim())) return setError(t("admin.prod.f.refReq"));

    setBusy(true);
    const res = await upsertProductAction(buildPayload(d, initial));
    setBusy(false);
    if (!res.ok) return setError(res.error ?? t("admin.prod.error"));
    setSaved(true);
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-8">
      {/* Basics */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">{t("admin.prod.sec.basics")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t("admin.prod.col.name")} *</label>
            <input className={inputCls} value={d.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>{t("admin.prod.col.category")} *</label>
            <select className={inputCls} value={d.category} onChange={(e) => set({ category: e.target.value })}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {localizedName(c, locale)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>ref_prefix</label>
            <input className={inputCls} value={d.ref_prefix} onChange={(e) => set({ ref_prefix: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>{t("admin.prod.f.descPt")}</label>
            <input className={inputCls} value={d.description_pt} onChange={(e) => set({ description_pt: e.target.value })} />
          </div>
        </div>
      </section>

      {/* Translations + media */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">{t("admin.prod.sec.i18n")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>name_en</label>
            <input className={inputCls} value={d.name_en} onChange={(e) => set({ name_en: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>name_zh</label>
            <input className={inputCls} value={d.name_zh} onChange={(e) => set({ name_zh: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>description_en</label>
            <input className={inputCls} value={d.description_en} onChange={(e) => set({ description_en: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>description_zh</label>
            <input className={inputCls} value={d.description_zh} onChange={(e) => set({ description_zh: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>{t("admin.prod.f.images")}</label>
            <input className={inputCls} value={d.images} onChange={(e) => set({ images: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>{t("admin.prod.f.applications")}</label>
            <input className={inputCls} value={d.applications} onChange={(e) => set({ applications: e.target.value })} />
          </div>
        </div>
      </section>

      {/* Specs */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">{t("admin.prod.sec.specs")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SPEC_KEYS.map((k) => (
            <div key={k}>
              <label className={labelCls}>{k}</label>
              <input
                className={inputCls}
                value={d.specs[k] ?? ""}
                onChange={(e) => set({ specs: { ...d.specs, [k]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* EU standards */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">{t("admin.prod.sec.standards")}</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {COMPLIANCE_KEYS.map((k) => (
            <div key={k}>
              <label className={labelCls}>{k.toUpperCase()}</label>
              <input
                className={inputCls}
                value={d.compliance[k] ?? ""}
                onChange={(e) => set({ compliance: { ...d.compliance, [k]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Variants */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">{t("admin.prod.sec.variants")} *</h2>
        <div className="space-y-3">
          {d.variants.map((v, i) => (
            <div key={i} className="rounded border border-aluminium p-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>{t("admin.prod.f.ref")}</label>
                  <input className={inputCls} value={v.ref} onChange={(e) => setVariant(i, { ref: e.target.value })} />
                </div>
                {VARIANT_NUM.map((k) => (
                  <div key={k}>
                    <label className={labelCls}>{k}</label>
                    <input
                      className={inputCls}
                      value={v.attrs[k] ?? ""}
                      onChange={(e) => setVariantAttr(i, k, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              {d.variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => set({ variants: d.variants.filter((_, j) => j !== i) })}
                  className="mt-2 text-xs text-red-600 hover:underline"
                >
                  {t("admin.prod.f.removeVariant")}
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ variants: [...d.variants, { ref: "", attrs: {} }] })}
            className="text-sm font-medium text-ink hover:underline"
          >
            + {t("admin.prod.f.addVariant")}
          </button>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">{t("admin.prod.saved")}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "…" : t("admin.prod.save")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="rounded border border-aluminium px-5 py-2.5 text-sm font-medium text-ink"
        >
          {t("admin.prod.cancel")}
        </button>
      </div>
    </form>
  );
}
