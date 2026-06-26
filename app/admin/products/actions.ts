"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATALOGUE_TAG } from "@/lib/catalogue/loadCatalogue";
import type { ImportedProduct } from "@/lib/productImport";

// All three run with the caller's session cookies, so the SECURITY DEFINER RPCs see the
// manager via is_manager(). On success we bust the catalogue ISR tag so edits go live.

export async function upsertProductAction(
  product: ImportedProduct,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("upsert_product", { p_product: product });
  if (error) return { ok: false, error: error.message };
  revalidateTag(CATALOGUE_TAG, "max");
  return { ok: true, id: data as string };
}

export async function importProductsAction(
  products: ImportedProduct[],
): Promise<{ ok: boolean; error?: string; count?: number }> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("import_products", { p_products: products });
  if (error) return { ok: false, error: error.message };
  revalidateTag(CATALOGUE_TAG, "max");
  const count = (data as { count?: number } | null)?.count ?? products.length;
  return { ok: true, count };
}

export async function setProductStatusAction(
  id: string,
  status: "active" | "retired",
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb.rpc("set_product_status", { p_id: id, p_status: status });
  if (error) return { ok: false, error: error.message };
  revalidateTag(CATALOGUE_TAG, "max");
  return { ok: true };
}
