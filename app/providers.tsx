"use client";
import { LocaleProvider } from "@/state/locale";
import { CartProvider } from "@/state/cart";
import { BomProvider } from "@/state/bom";
import { ListsProvider } from "@/state/lists";
import { CompareProvider } from "@/state/compare";
import { AnalyticsProvider } from "@/state/analytics";
import { AuthProvider } from "@/state/auth";
import { CatalogueProvider } from "@/state/catalogue";
import type { Catalogue } from "@/lib/types";
export function Providers({ catalogue, children }: { catalogue: Catalogue; children: React.ReactNode }) {
  return <CatalogueProvider data={catalogue}><AuthProvider><LocaleProvider><AnalyticsProvider><CartProvider><BomProvider><ListsProvider><CompareProvider>{children}</CompareProvider></ListsProvider></BomProvider></CartProvider></AnalyticsProvider></LocaleProvider></AuthProvider></CatalogueProvider>;
}
