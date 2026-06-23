import { Suspense } from "react";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/Footer";
import { CatalogueView } from "@/components/catalogue/CatalogueView";
import { translate } from "@/lib/i18n";

export default function Home() {
  return (
    <>
      <Nav />
      <Suspense fallback={<div className="py-20 text-center text-aluminium-dark text-sm">{translate("zh", "cat.loading")}</div>}>
        <CatalogueView />
      </Suspense>
      <Footer />
    </>
  );
}
