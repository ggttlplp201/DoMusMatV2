"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  InMemoryProductRepository,
  repo as staticRepo,
  type ProductRepository,
} from "@/lib/repository";
import type { Catalogue } from "@/lib/types";

const CatalogueContext = createContext<ProductRepository | null>(null);

/** Hydrates the in-memory repository from server-loaded catalogue data (see loadCatalogue). */
export function CatalogueProvider({ data, children }: { data: Catalogue; children: ReactNode }) {
  const value = useMemo(() => new InMemoryProductRepository(data), [data]);
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

/**
 * The catalogue repository. Returns the provider's DB-backed repo in the app; falls back to the
 * static repo when no provider is mounted (component tests render without wrapping).
 */
export function useCatalogue(): ProductRepository {
  return useContext(CatalogueContext) ?? staticRepo;
}
