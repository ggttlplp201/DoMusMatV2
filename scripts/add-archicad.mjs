import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataPath = join(__dirname, "../data/product_data.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

let added = 0;
let skipped = 0;

for (const product of data.products) {
  const assets = product.bim_assets || [];
  const formats = new Set(assets.map((a) => a.format));

  if (formats.has("PLA")) {
    skipped++;
    continue;
  }

  // Find RFA index to insert PLA right after it
  const rfaIndex = assets.findIndex((a) => a.format === "RFA");
  const insertAt = rfaIndex >= 0 ? rfaIndex + 1 : assets.length;

  const plaEntry = {
    format: "PLA",
    label: "ArchiCAD GDL",
    file: "PLACEHOLDER",
    size: "PLACEHOLDER",
    primary: true,
  };

  assets.splice(insertAt, 0, plaEntry);
  product.bim_assets = assets;
  added++;
}

writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
console.log(`Done: added PLA to ${added} products, skipped ${skipped} (already had PLA).`);
