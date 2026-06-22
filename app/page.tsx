import { Suspense } from "react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { CatalogueView } from "@/components/catalogue/CatalogueView";

export default function Home() {
  return (
    <>
      <Nav />
      <Suspense fallback={<div className="py-20 text-center text-aluminium-dark text-sm">A carregar catálogo…</div>}>
        <CatalogueView />
      </Suspense>
      <Footer />
    </>
  );
}
