"use client";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { ComparisonTable } from "@/components/compare/ComparisonTable";
import { useCompare } from "@/state/compare";

export default function ComparePage() {
  const { refs, toggle } = useCompare();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1440px] px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold text-ink">Comparar produtos</h1>
        {refs.length === 0 ? (
          <p className="text-aluminium-dark">
            Nenhum produto selecionado para comparação. Adicione produtos a partir do catálogo.
          </p>
        ) : (
          <ComparisonTable productIds={refs} onRemove={toggle} />
        )}
      </main>
      <Footer />
    </>
  );
}
