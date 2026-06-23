import { Suspense } from "react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { DetailView } from "@/components/detail/DetailView";
import { repo } from "@/lib/repository";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return repo.getProducts().map((p) => ({ id: p.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!repo.getProduct(id)) notFound();
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
