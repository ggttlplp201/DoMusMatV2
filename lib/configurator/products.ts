import type { ProductMeta } from "./types";

export const MATERIALS = [
  { id: "marble-white", name: "Marble White", color: "#ECEAE4" },
  { id: "walnut",       name: "Walnut",       color: "#6B4A2B" },
  { id: "slate",        name: "Slate",        color: "#3A3F44" },
  { id: "sage",         name: "Sage",         color: "#9CAF88" },
  { id: "oak",          name: "Oak",          color: "#C9A36B" },
];

/** keyed by catalogue product `id` (see data/product_data.json) */
export const CONFIGURABLE_PRODUCTS: Record<string, ProductMeta> = {
  "balizador-de-jardim-led": { ref: "balizador-de-jardim-led", name: "LED Bollard", realDimsMm: { w:100, h:900, d:100 }, allowedSurfaces: ["floor"] },
  // add the remaining 2–4 MVP products here once their refs/dims are confirmed.
};
