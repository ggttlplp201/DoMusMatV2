import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { catalogue as staticCatalogue } from "@/lib/types";
import type { Catalogue } from "@/lib/types";
import { rowsToCatalogue, type CatalogueRows } from "./transform";

export const CATALOGUE_TAG = "catalogue";

// Exactly the columns that map to ProductRow — NOT created_at/updated_at, which would
// leak into the rebuilt Product and break the deep-equal correctness gate. status and
// sort_order are selected (rowsToCatalogue strips them).
const PRODUCT_COLUMNS =
  "id,category,name,name_en,name_zh,ref_prefix,description_pt,description_en,description_zh," +
  "applications,images,shared_specs,model3d,compliance,bim_assets,bim_metadata," +
  "standardization,supply_chain,status,sort_order";

// Cookie-less anon read: RLS returns only active products, and the absence of cookies/headers
// keeps this compatible with the unstable_cache scope.
async function fetchRows(): Promise<CatalogueRows | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [cats, prods, vars] = await Promise.all([
    sb.from("categories").select("id,name,name_en,name_zh,sort_order"),
    sb.from("products").select(PRODUCT_COLUMNS),
    sb.from("product_variants").select("ref,product_id,attrs,sort_order"),
  ]);

  const err = cats.error || prods.error || vars.error;
  if (err) {
    console.warn("[loadCatalogue] DB error, falling back to static:", err.message);
    return null;
  }
  // Treat an empty/unseeded catalogue as "not ready" -> static fallback.
  if (!cats.data?.length || !prods.data?.length) return null;

  return {
    categories: cats.data,
    products: prods.data as unknown as CatalogueRows["products"],
    variants: (vars.data ?? []) as unknown as CatalogueRows["variants"],
  };
}

const getCachedRows = unstable_cache(fetchRows, ["catalogue-rows-v1"], {
  revalidate: 60,
  tags: [CATALOGUE_TAG],
});

/**
 * The live catalogue, sourced from Supabase with a static fallback. Wrapped in React cache()
 * so all components in one render share a single fetch; unstable_cache adds cross-request ISR
 * (60s, revalidated by tag on writes in Phase B). manufacturer + commercial stay static.
 */
export const loadCatalogue = cache(async (): Promise<Catalogue> => {
  let rows: CatalogueRows | null = null;
  try {
    rows = await getCachedRows();
  } catch (e) {
    console.warn("[loadCatalogue] fetch threw, using static fallback:", (e as Error).message);
  }
  if (!rows) return staticCatalogue;
  return rowsToCatalogue(rows, {
    manufacturer: staticCatalogue.manufacturer,
    commercial: staticCatalogue.commercial,
  });
});
