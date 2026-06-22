"use client";
import { useState } from "react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { useCart } from "@/state/cart";
import { buildBomLines } from "@/lib/bom";
import { t } from "@/lib/strings";

export default function CartPage() {
  const { items, remove, setQty, clear, count } = useCart();
  const lines = buildBomLines(items);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
    clear();
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1440px] px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold text-ink">Orçamento</h1>

        {items.length === 0 && !submitted && (
          <p className="text-aluminium-dark py-8 text-center">
            O seu orçamento está vazio.
          </p>
        )}

        {submitted && (
          <div className="rounded border border-aluminium bg-neutral-fill px-6 py-8 text-center">
            <p className="text-ink font-medium">Pedido de orçamento registado (demo)</p>
            <p className="mt-1 text-sm text-aluminium-dark">A nossa equipa entrará em contacto brevemente.</p>
          </div>
        )}

        {items.length > 0 && !submitted && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-neutral-fill text-aluminium-dark">
                    <th className="py-2 px-3 text-left font-medium">Referência</th>
                    <th className="py-2 px-3 text-left font-medium">Produto</th>
                    <th className="py-2 px-3 text-right font-medium">Qtd</th>
                    <th className="py-2 px-3 text-right font-medium">Preço unitário</th>
                    <th className="py-2 px-3 text-right font-medium">Total</th>
                    <th className="py-2 px-3 text-right font-medium sr-only">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr
                      key={line.ref}
                      className={i % 2 === 0 ? "bg-white" : "bg-neutral-fill"}
                    >
                      <td className="py-2 px-3 font-mono text-xs text-ink">{line.ref}</td>
                      <td className="py-2 px-3 text-ink">{line.name}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-ink">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            aria-label={`Diminuir quantidade de ${line.ref}`}
                            onClick={() => {
                              const cur = items.find(it => it.ref === line.ref)?.quantity ?? 1;
                              if (cur <= 1) remove(line.ref);
                              else setQty(line.ref, cur - 1);
                            }}
                            className="text-aluminium-dark hover:text-ink text-sm w-5 h-5 flex items-center justify-center border border-aluminium rounded"
                          >
                            −
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Aumentar quantidade de ${line.ref}`}
                            onClick={() => {
                              const cur = items.find(it => it.ref === line.ref)?.quantity ?? 1;
                              setQty(line.ref, cur + 1);
                            }}
                            className="text-aluminium-dark hover:text-ink text-sm w-5 h-5 flex items-center justify-center border border-aluminium rounded"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-ink">{line.unitPrice}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-ink">{line.lineTotal}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          aria-label={`Remover ${line.ref}`}
                          onClick={() => remove(line.ref)}
                          className="text-xs text-aluminium-dark hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={clear}
                className="rounded border border-aluminium px-4 py-2 text-sm text-aluminium-dark hover:bg-neutral-fill"
              >
                Limpar
              </button>
              <button
                onClick={handleSubmit}
                className="rounded bg-brand px-6 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Pedir orçamento
              </button>
            </div>
          </>
        )}

        <p className="mt-8 text-xs text-aluminium-dark">{t.vatNote}</p>
      </main>
      <Footer />
    </>
  );
}
