"use client";
import { createContext, useContext } from "react";
import { usePersistentState } from "./usePersistentState";
import type { BomItem } from "@/lib/bom";

interface BomCtx { items: BomItem[]; add(ref: string, qty: number): void; remove(ref: string): void; setQty(ref: string, qty: number): void; clear(): void; count: number; }
const Ctx = createContext<BomCtx | null>(null);
export function BomProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = usePersistentState<BomItem[]>("dmm.bom", []);
  const add = (ref: string, qty: number) => setItems(prev => {
    const f = prev.find(i => i.ref === ref);
    return f ? prev.map(i => i.ref === ref ? { ...i, quantity: i.quantity + qty } : i) : [...prev, { ref, quantity: qty }];
  });
  const remove = (ref: string) => setItems(prev => prev.filter(i => i.ref !== ref));
  const setQty = (ref: string, qty: number) => setItems(prev => prev.map(i => i.ref === ref ? { ...i, quantity: qty } : i));
  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return <Ctx.Provider value={{ items, add, remove, setQty, clear, count }}>{children}</Ctx.Provider>;
}
export function useBom() { const c = useContext(Ctx); if (!c) throw new Error("useBom outside BomProvider"); return c; }
