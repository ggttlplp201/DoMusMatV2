import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');

const catalogue = JSON.parse(readFileSync(join(dataDir, 'product_data.json'), 'utf8'));
const i18n = JSON.parse(readFileSync(join(dataDir, '_i18n_desc.json'), 'utf8'));

let updated = 0;
let skipped = 0;
for (const product of catalogue.products) {
  const translations = i18n[product.id];
  if (!translations) {
    console.warn(`No translations found for product: ${product.id}`);
    skipped++;
    continue;
  }
  if (translations.en) {
    product.description_en = translations.en;
  }
  if (translations.zh) {
    product.description_zh = translations.zh;
  }
  updated++;
}

writeFileSync(join(dataDir, 'product_data.json'), JSON.stringify(catalogue, null, 2), 'utf8');
console.log(`Updated ${updated} products (skipped ${skipped}).`);
