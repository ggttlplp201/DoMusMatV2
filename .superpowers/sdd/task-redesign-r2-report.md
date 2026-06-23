# Redesign R2 — Home / Category Landing Page

## Sections built

1. **Hero** — `1.05fr 1fr` grid (stacks on mobile), 84/36/72px padding, max-w-1440. Red mono eyebrow, H1 58px/600/−0.025em (2-line with `\n` split), body para, two CTAs (brand button + outline+download-icon). Right: 4:3 wash container with `next/image` fill from first product with images; bottom-left mono pill "渲染图 · RENDER".

2. **Stats band** — top/bottom hairline borders, 4-col grid (2-col on mobile), 32px/36px padding, right dividers. Live values: 47 products, 8 categories, 9 distinct BIM/CAD formats, 193 total downloadable files.

3. **Categories** — 72px/36px padding, max-w-1440. H2 + brand "view all" link. 4-col (2-col mobile) tile grid with mono category codes (LED/FLR/SKB/JNR/DRN/DOR/MTL/MIR), localized names, real per-category counts.

4. **Featured downloads** — 0/36px/84px padding, max-w-1440. H2 + mono "BIM · CAD · RENDER". 3-col (1-col mobile) card grid from first 3 real products: 4:3 next/image, mono category eyebrow, localized title, format badges (up to 4).

## i18n keys added

All three locales (pt/en/zh) in `lib/i18n.ts`:

- `home.heroTitle`, `home.heroBody`
- `home.cta.browse`, `home.cta.download`
- `home.stat.products`, `home.stat.categories`, `home.stat.formats`, `home.stat.files`
- `home.cats.title`, `home.cats.viewAll`, `home.cats.countSuffix`
- `home.featured.title`

## Test / Build

- `npm run test`: **121 tests passed (31 test files)**
- `npm run build`: **✓ Compiled successfully**, `/` prerendered as static content

## Commit

See git log for commit hash.
