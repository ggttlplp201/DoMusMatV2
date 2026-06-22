"use client";
import { CartProvider } from "@/state/cart";
import { BomProvider } from "@/state/bom";
import { ListsProvider } from "@/state/lists";
import { CompareProvider } from "@/state/compare";
import { AnalyticsProvider } from "@/state/analytics";
export function Providers({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider><CartProvider><BomProvider><ListsProvider><CompareProvider>{children}</CompareProvider></ListsProvider></BomProvider></CartProvider></AnalyticsProvider>;
}
