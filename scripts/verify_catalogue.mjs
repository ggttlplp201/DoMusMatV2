// Phase A integration gate: load the catalogue from Supabase exactly the way the live app does
// (anon key, active products, same columns) and deep-compare against the static product_data.json.
// A clean run proves the migration renders identically. Run AFTER applying 0004 + seeding.
//
//   node scripts/verify_catalogue.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local (or env).

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { createClient } from "@supabase/supabase-js";

// --- load .env.local into process.env (simple KEY=VALUE parser) ---
const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local or env).");
  process.exit(1);
}

const PRODUCT_COLUMNS =
  "id,category,name,name_en,name_zh,ref_prefix,description_pt,description_en,description_zh," +
  "applications,images,shared_specs,model3d,compliance,bim_assets,bim_metadata," +
  "standardization,supply_chain,status,sort_order";

const dataPath = fileURLToPath(new URL("../data/product_data.json", import.meta.url));
const staticCat = JSON.parse(readFileSync(dataPath, "utf8"));

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const [cats, prods, vars] = await Promise.all([
  sb.from("categories").select("id,name,name_en,name_zh,sort_order"),
  sb.from("products").select(PRODUCT_COLUMNS),
  sb.from("product_variants").select("ref,product_id,attrs,sort_order"),
]);
for (const r of [cats, prods, vars]) if (r.error) { console.error(r.error.message); process.exit(1); }

// rebuild (mirrors rowsToCatalogue)
const categories = [...cats.data].sort((a, b) => a.sort_order - b.sort_order)
  .map(({ sort_order, ...rest }) => rest);
const byProduct = new Map();
for (const v of vars.data) (byProduct.get(v.product_id) ?? byProduct.set(v.product_id, []).get(v.product_id)).push(v);
const products = [...prods.data].sort((a, b) => a.sort_order - b.sort_order)
  .map(({ sort_order, status, ...rest }) => ({
    ...rest,
    variants: (byProduct.get(rest.id) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({ ref: v.ref, attrs: v.attrs })),
  }));

// --- compare ---
let fails = 0;
function check(label, got, want) {
  try { assert.deepStrictEqual(got, want); console.log(`  ✓ ${label}`); }
  catch (e) { fails++; console.error(`  ✗ ${label}\n    ${String(e.message).split("\n").slice(0, 6).join("\n    ")}`); }
}

console.log(`Verifying ${URL}`);
check(`categories (${categories.length})`, categories, staticCat.categories);
check(`product count`, products.length, staticCat.products.length);

const wantById = new Map(staticCat.products.map((p) => [p.id, p]));
for (const p of products) {
  const want = wantById.get(p.id);
  if (!want) { fails++; console.error(`  ✗ extra product not in static: ${p.id}`); continue; }
  check(`product ${p.id}`, p, want);
}
for (const id of wantById.keys()) if (!products.find((p) => p.id === id)) { fails++; console.error(`  ✗ missing product: ${id}`); }

console.log(fails === 0 ? "\nPASS — DB catalogue is identical to product_data.json ✓"
                        : `\nFAIL — ${fails} mismatch(es) above`);
process.exit(fails === 0 ? 0 : 1);
