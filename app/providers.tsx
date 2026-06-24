"use client";
import { LocaleProvider } from "@/state/locale";
import { CartProvider } from "@/state/cart";
import { BomProvider } from "@/state/bom";
import { ListsProvider } from "@/state/lists";
import { CompareProvider } from "@/state/compare";
import { AnalyticsProvider } from "@/state/analytics";
import { AuthProvider } from "@/state/auth";
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><LocaleProvider><AnalyticsProvider><CartProvider><BomProvider><ListsProvider><CompareProvider>{children}</CompareProvider></ListsProvider></BomProvider></CartProvider></AnalyticsProvider></LocaleProvider></AuthProvider>;
}
