"use client";
import { createContext, useContext, useRef } from "react";
import { LocalAnalyticsSink, type AnalyticsSink } from "@/lib/analytics";
const Ctx = createContext<AnalyticsSink | null>(null);
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const sink = useRef<AnalyticsSink>(new LocalAnalyticsSink());
  return <Ctx.Provider value={sink.current}>{children}</Ctx.Provider>;
}
export function useAnalytics(): AnalyticsSink {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAnalytics outside AnalyticsProvider");
  return c;
}
