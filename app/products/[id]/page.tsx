import { Suspense } from "react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { DetailView } from "@/components/detail/DetailView";
import { loadCatalogue } from "@/lib/catalogue/loadCatalogue";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const catalogue = await loadCatalogue();
  return catalogue.products.map((p) => ({ id: p.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalogue = await loadCatalogue();
  if (!catalogue.products.some((p) => p.id === id)) notFound();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1440px] px-9">
        <Suspense fallback={null}>
          <DetailView productId={id} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
