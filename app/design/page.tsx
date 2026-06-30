"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { useCatalogue } from "@/state/catalogue";
import { useCart } from "@/state/cart";
import { useT, useLocale } from "@/state/locale";
import { localizedName } from "@/lib/i18n";
import { hasRealValue } from "@/lib/placeholder";
import { buildSpecPackage } from "@/lib/spec/documents";
import type { Product } from "@/lib/types";
import {
  composeSolution,
  PROJECTS,
  SPACES,
  PERFORMANCE,
  TIERS,
  type Tier,
  type DesignSolution,
} from "@/lib/design/systems";

const STEPS = ["project", "space", "priorities", "solution"] as const;
type StepIndex = 0 | 1 | 2 | 3;

const cardBase =
  "text-left rounded-xl border p-4 transition-colors cursor-pointer hover:border-ink";
const cardOn = "border-ink bg-neutral-fill";
const cardOff = "border-aluminium bg-white";

function firstRef(product: { variants?: { ref: string }[] } | null): string | null {
  const r = product?.variants?.find((v) => v.ref && v.ref !== "PLACEHOLDER")?.ref;
  return r ?? null;
}

// Ref to add to the quote: the real SKU, or the product id for SKU-less products
// (bom/order resolve product-id refs via getProduct).
function quoteRef(product: Product | null): string | null {
  if (!product) return null;
  return firstRef(product) ?? product.id;
}

export default function DesignPage() {
  const t = useT();
  const { locale } = useLocale();
  const repo = useCatalogue();
  const { add } = useCart();

  const [step, setStep] = useState<StepIndex>(0);
  const [project, setProject] = useState<string | null>(null);
  const [space, setSpace] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("standard");
  const [performance, setPerformance] = useState<string[]>([]);
  const [solution, setSolution] = useState<DesignSolution | null>(null);
  const [showTech, setShowTech] = useState(false);
  const [quoted, setQuoted] = useState(false);

  const togglePerf = (c: string) =>
    setPerformance((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  function generate() {
    if (!project || !space) return;
    setSolution(composeSolution({ project, space, tier, performance }, (cat) => repo.getProductsByCategory(cat)));
    setQuoted(false);
    setShowTech(false);
    setStep(3);
  }

  function restart() {
    setStep(0);
    setProject(null);
    setSpace(null);
    setTier("standard");
    setPerformance([]);
    setSolution(null);
    setQuoted(false);
  }

  function requestQuote() {
    if (!solution) return;
    const seen = new Set<string>();
    for (const s of solution.systems) {
      const ref = quoteRef(s.product);
      if (ref && !seen.has(ref)) {
        seen.add(ref);
        add(ref, 1);
      }
    }
    setQuoted(true);
  }

  const canReach = (i: number) =>
    i === 0 || (i === 1 && project) || (i === 2 && project && space) || (i === 3 && !!solution);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-ink">{t("design.title")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-aluminium-dark">{t("design.intro")}</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Step rail */}
          <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {STEPS.map((s, i) => {
              const active = step === i;
              const reachable = canReach(i);
              return (
                <li key={s}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && setStep(i as StepIndex)}
                    className={`w-full whitespace-nowrap rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                      active ? "bg-ink text-white" : reachable ? "text-ink hover:bg-neutral-fill" : "text-aluminium-dark"
                    }`}
                  >
                    <span className="mr-2 font-mono text-xs opacity-60">{i + 1}</span>
                    {t(`design.step.${s}`)}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Content */}
          <section className="rounded-2xl border border-aluminium p-6">
            {step === 0 && (
              <Picker
                title={t("design.q.project")}
                items={PROJECTS}
                ns="design.project"
                selected={project}
                onPick={(v) => {
                  setProject(v);
                  setStep(1);
                }}
              />
            )}

            {step === 1 && (
              <>
                <Picker
                  title={t("design.q.space")}
                  items={SPACES}
                  ns="design.space"
                  selected={space}
                  onPick={(v) => {
                    setSpace(v);
                    setStep(2);
                  }}
                />
                <BackBtn onClick={() => setStep(0)} label={t("design.back")} />
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-lg font-semibold text-ink">{t("design.q.tier")}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {TIERS.map((tr) => (
                    <button
                      key={tr}
                      type="button"
                      onClick={() => setTier(tr)}
                      className={`${cardBase} ${tier === tr ? cardOn : cardOff}`}
                    >
                      <div className="font-semibold text-ink">{t(`design.tier.${tr}`)}</div>
                      <div className="mt-1 text-xs text-aluminium-dark">{t(`design.tier.${tr}.desc`)}</div>
                    </button>
                  ))}
                </div>

                <h2 className="mt-6 text-lg font-semibold text-ink">{t("design.q.performance")}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PERFORMANCE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => togglePerf(c)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        performance.includes(c) ? "border-ink bg-ink text-white" : "border-aluminium text-ink hover:border-ink"
                      }`}
                    >
                      {t(`spec.cond.${c}`)}
                    </button>
                  ))}
                </div>

                <div className="mt-7 flex items-center gap-3">
                  <button onClick={generate} className="rounded bg-brand px-5 py-2.5 text-sm font-semibold text-white">
                    {t("design.generate")}
                  </button>
                  <BackBtn onClick={() => setStep(1)} label={t("design.back")} inline />
                </div>
              </>
            )}

            {step === 3 && solution && (
              <SolutionView
                solution={solution}
                showTech={showTech}
                setShowTech={setShowTech}
                quoted={quoted}
                onQuote={requestQuote}
                onRestart={restart}
              />
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );

  function SolutionView({
    solution,
    showTech,
    setShowTech,
    quoted,
    onQuote,
    onRestart,
  }: {
    solution: DesignSolution;
    showTech: boolean;
    setShowTech: (v: boolean) => void;
    quoted: boolean;
    onQuote: () => void;
    onRestart: () => void;
  }) {
    const products = Array.from(
      new Map(solution.systems.filter((s) => s.product).map((s) => [s.product!.id, s.product!])).values(),
    );
    return (
      <>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-ink">{t("design.result.title")}</h2>
            <p className="mt-1 text-sm text-aluminium-dark">{t("design.result.subtitle")}</p>
          </div>
          <div className="text-xs font-mono uppercase tracking-wide text-aluminium-dark">
            {t(`design.project.${solution.input.project}`)} · {t(`design.space.${solution.input.space}`)} ·{" "}
            {t(`design.tier.${solution.input.tier}`)}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-aluminium text-left text-xs uppercase tracking-wide text-aluminium-dark">
                <th className="py-2 pr-4">{t("design.col.system")}</th>
                <th className="py-2 pr-4">{t("design.col.product")}</th>
                <th className="py-2 pr-4">{t("design.col.budget")}</th>
                <th className="py-2 pr-4">{t("design.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {solution.systems.map((s) => (
                <tr key={s.key} className="border-b border-neutral-fill align-top">
                  <td className="py-3 pr-4 font-medium text-ink">{t(`design.sys.${s.key}`)}</td>
                  <td className="py-3 pr-4">
                    {s.product ? (
                      <Link href={`/products/${s.product.id}`} className="text-ink hover:underline">
                        {localizedName(s.product, locale)}
                        <span className="ml-2 font-mono text-xs text-aluminium-dark">{firstRef(s.product)}</span>
                      </Link>
                    ) : (
                      <span className="text-aluminium-dark">{t("design.noProduct")}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-aluminium-dark">{s.budget}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.product ? "bg-emerald-50 text-emerald-700" : "bg-neutral-fill text-aluminium-dark"
                      }`}
                    >
                      {s.product ? t("design.status.own") : t("design.status.none")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BIM / CAD files — direct access to each recommended product's catalogue files */}
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-aluminium-dark">
            {t("design.files")}
          </h3>
          <div className="space-y-2">
            {products.map((p) => {
              const assets = (p.bim_assets ?? []).filter((a) => hasRealValue(a.file));
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-aluminium bg-white p-3 text-sm"
                >
                  <span className="font-medium text-ink">{localizedName(p, locale)}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {assets.length > 0 ? (
                      assets.map((a, i) => (
                        <a
                          key={i}
                          href={a.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-ink px-2 py-0.5 text-xs font-medium text-ink hover:bg-neutral-fill"
                        >
                          {a.format} ↓
                        </a>
                      ))
                    ) : (
                      <span className="text-xs text-aluminium-dark">{t("design.noFiles")}</span>
                    )}
                  </div>
                  <Link href={`/products/${p.id}`} className="ml-auto text-xs font-medium text-[#DA1E28] hover:underline">
                    {t("design.allFiles")} →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technical output (reuses the spec engine) */}
        <button
          onClick={() => setShowTech(!showTech)}
          className="mt-5 rounded border border-aluminium px-3 py-1.5 text-xs font-medium text-ink"
        >
          {t("design.tech")} {showTech ? "▴" : "▾"}
        </button>
        {showTech && (
          <div className="mt-3 space-y-3">
            {solution.systems
              .filter((s) => s.product)
              .map((s) => {
                const pkg = buildSpecPackage(s.ctx, s.product!, s.requirements, locale);
                return (
                  <div key={s.key} className="rounded border border-aluminium bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-aluminium-dark">
                      {t(`design.sys.${s.key}`)} · {t("spec.tab.boq")}
                    </div>
                    <p className="mt-1 text-sm text-ink">{pkg.boq}</p>
                  </div>
                );
              })}
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button onClick={onQuote} className="rounded bg-ink px-5 py-2.5 text-sm font-semibold text-white">
            {t("design.requestQuote")}
          </button>
          {quoted && (
            <span className="text-sm text-emerald-700">
              {t("design.quoted")}{" "}
              <Link href="/cart" className="underline">
                →
              </Link>
            </span>
          )}
          <button onClick={onRestart} className="rounded border border-aluminium px-5 py-2.5 text-sm font-medium text-ink">
            {t("design.restart")}
          </button>
        </div>
      </>
    );
  }
}

function Picker({
  title,
  items,
  ns,
  selected,
  onPick,
}: {
  title: string;
  items: string[];
  ns: string;
  selected: string | null;
  onPick: (v: string) => void;
}) {
  const t = useT();
  return (
    <>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <button
            key={it}
            type="button"
            onClick={() => onPick(it)}
            className={`${cardBase} ${selected === it ? cardOn : cardOff}`}
          >
            <div className="font-semibold text-ink">{t(`${ns}.${it}`)}</div>
            <div className="mt-1 text-xs text-aluminium-dark">{t(`${ns}.${it}.desc`)}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function BackBtn({ onClick, label, inline }: { onClick: () => void; label: string; inline?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${inline ? "" : "mt-5 "}rounded border border-aluminium px-4 py-2 text-sm font-medium text-ink`}
    >
      ← {label}
    </button>
  );
}
