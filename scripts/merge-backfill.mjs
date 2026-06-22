import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');

const catalogue = JSON.parse(readFileSync(join(dataDir, 'product_data.json'), 'utf8'));
const backfill = JSON.parse(readFileSync(join(dataDir, '_backfill.json'), 'utf8'));

let updated = 0;
for (const product of catalogue.products) {
  const patch = backfill[product.id];
  if (!patch) continue;
  if (patch.description_pt && patch.description_pt !== 'PLACEHOLDER') {
    product.description_pt = patch.description_pt;
  }
  if (patch.images && patch.images.length > 0) {
    product.images = patch.images;
  }
  if (patch.applications && patch.applications.length > 0) {
    product.applications = patch.applications;
  }
  updated++;
}

writeFileSync(join(dataDir, 'product_data.json'), JSON.stringify(catalogue, null, 2), 'utf8');
console.log(`Updated ${updated} products`);
