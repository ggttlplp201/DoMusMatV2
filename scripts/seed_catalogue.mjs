// Seed Supabase catalogue tables (categories, products, product_variants) from the
// static data/product_data.json. Idempotent (upsert on PK). Uses the SERVICE-ROLE key,
// which bypasses RLS — keep it out of the repo and shell history.
//
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed_catalogue.mjs
//
// SUPABASE_URL defaults to the known project; override via env if needed.
//
// The flatten below mirrors lib/catalogue/transform.ts#catalogueToRows (whose round-trip
// test is the canonical gate). scripts/verify_catalogue.mjs deep-compares what the live app
// loads back against this JSON, so any drift here is caught there.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://gxonaevrpvnbtyovqksk.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var (Settings -> API -> service_role).");
  process.exit(1);
}

const dataPath = fileURLToPath(new URL("../data/product_data.json", import.meta.url));
const catalogue = JSON.parse(readFileSync(dataPath, "utf8"));

// --- flatten (mirrors catalogueToRows) ---
const categories = catalogue.categories.map((c, i) => ({
  id: c.id,
  name: c.name,
  name_en: c.name_en,
  name_zh: c.name_zh,
  sort_order: i,
}));

const products = [];
const variants = [];
catalogue.products.forEach((p, pi) => {
  const { variants: pv, ...rest } = p;
  products.push({ ...rest, status: "active", sort_order: pi });
  (pv || []).forEach((v, vi) => {
    variants.push({ ref: v.ref, product_id: p.id, attrs: v.attrs, sort_order: vi });
  });
});

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsert(table, rows, onConflict) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) {
    console.error(`  ${table}: FAILED -> ${error.message}`);
    process.exit(1);
  }
  console.log(`  ${table}: upserted ${rows.length}`);
}

console.log(`Seeding ${SUPABASE_URL}`);
// FK order: categories -> products -> variants
await upsert("categories", categories, "id");
await upsert("products", products, "id");
await upsert("product_variants", variants, "product_id,ref");

// sanity read-back
const { count: pc } = await supabase.from("products").select("*", { count: "exact", head: true });
const { count: vc } = await supabase.from("product_variants").select("*", { count: "exact", head: true });
console.log(`\nDone. products=${pc} variants=${vc} categories=${categories.length}`);
