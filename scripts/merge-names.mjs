import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');

const catalogue = JSON.parse(readFileSync(join(dataDir, 'product_data.json'), 'utf8'));
const i18n = JSON.parse(readFileSync(join(dataDir, '_i18n_names.json'), 'utf8'));

const categories = i18n['__categories__'] ?? {};

let updatedCats = 0;
let skippedCats = 0;
for (const cat of catalogue.categories) {
  const trans = categories[cat.id];
  if (!trans) {
    console.warn(`No name translations found for category: ${cat.id}`);
    skippedCats++;
    continue;
  }
  if (trans.en) cat.name_en = trans.en;
  if (trans.zh) cat.name_zh = trans.zh;
  updatedCats++;
}

let updatedProds = 0;
let skippedProds = 0;
for (const product of catalogue.products) {
  const trans = i18n[product.id];
  if (!trans) {
    console.warn(`No name translations found for product: ${product.id}`);
    skippedProds++;
    continue;
  }
  if (trans.en) product.name_en = trans.en;
  if (trans.zh) product.name_zh = trans.zh;
  updatedProds++;
}

writeFileSync(join(dataDir, 'product_data.json'), JSON.stringify(catalogue, null, 2), 'utf8');
console.log(`Updated ${updatedCats} categories (skipped ${skippedCats}), ${updatedProds} products (skipped ${skippedProds}).`);
