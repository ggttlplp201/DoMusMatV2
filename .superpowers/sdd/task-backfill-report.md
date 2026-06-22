# DoMusMat Catalogue Backfill Report

**Date:** 2026-06-22

## Summary

Full backfill of Portuguese descriptions and product images for the DoMusMat catalogue (`data/product_data.json`).

## Results

| Metric | Count |
|--------|-------|
| Total products | 47 |
| Products updated | 46 (roupeiro was pre-backfilled, skipped) |
| Products with PT descriptions (after) | 47 / 47 |
| Products with images (after) | 47 / 47 |
| Total product images | 156 |
| Still missing desc | 0 |
| Still 0 images | 0 |

## Products — Images per product (highlights)

- `armario-de-cozinha`: 9 images
- `armario-casa-de-banho`: 7 images
- `barra-linear-led-fina-sensor`: 7 images
- `foco-encastrar-led-quadrado-exterior`: 9 images
- Most products: 2–4 images

## Products Not Matched / Issues

All 46 products (excluding pre-backfilled `roupeiro`) were successfully matched to their live product pages.

**Two products had no Portuguese description on first crawl** — required a second targeted fetch:
- `barra-linear-led-45w-sensor` (Barra Linear LED 45W c/ sensor) — first fetch returned English; second fetch retrieved Portuguese text
- `foco-encastrar-led-quadrado-exterior` (Foco de Encastrar LED quadrado (exterior)) — same issue; Portuguese text retrieved on second fetch

**Note:** The product `barra-linear-led-45w-sensor` page at domusmat.pt has both Portuguese and English content rendered server-side; the Portuguese text was confirmed and extracted.

## Validation Counts

```
products 47
still missing desc 0
still 0 images 0
```

## Build Result

`npm run build` — SUCCESS (54 static pages generated, TypeScript check passed)

## Test Result

`npm run test -- lib/types.test.ts` — 8/8 tests passed

## Files Created/Updated

- `data/product_data.json` — patched with real PT descriptions + images
- `data/_backfill.json` — raw backfill data keyed by product ID
- `scripts/merge-backfill.mjs` — merge script (kept for future re-runs)
