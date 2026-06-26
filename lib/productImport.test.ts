import { describe, it, expect } from "vitest";
import { parseProductCsv } from "./productImport";

const CATS = new Set(["iluminacao-led", "pavimentos"]);
const opts = { validCategories: CATS };

const HEADER =
  "name,category,ref,name_en,name_zh,ref_prefix,description_pt,images,applications," +
  "ip_rating,material,color_temperature,power_w,lumens,ce,euroclass";

describe("parseProductCsv", () => {
  it("parses a single product + variant from required fields, no errors", () => {
    const csv = `${HEADER}\nGarden Bollard,iluminacao-led,DMSL-12W,,,,,,,65,Aluminium,,12,240,CE,`;
    const { products, errors } = parseProductCsv(csv, opts);
    expect(errors).toEqual([]);
    expect(products).toHaveLength(1);
    const p = products[0];
    expect(p.id).toBe("garden-bollard");
    expect(p.category).toBe("iluminacao-led");
    expect(p.name).toBe("Garden Bollard");
    expect(p.variants).toEqual([{ ref: "DMSL-12W", attrs: { power_w: 12, lumens: 240 } }]);
    expect(p.shared_specs).toEqual({ ip_rating: 65, material: "Aluminium" });
    expect(p.status).toBe("active");
    expect(p.model3d).toBe("PLACEHOLDER");
  });

  it("maps EU-standard columns to compliance (present -> declared, absent -> PLACEHOLDER)", () => {
    const csv = `${HEADER}\nGarden Bollard,iluminacao-led,DMSL-12W,,,,,,,,,,,,CE,`;
    const { products } = parseProductCsv(csv, opts);
    expect(products[0].compliance.ce).toEqual({ status: "declared", value: "CE", document: "PLACEHOLDER" });
    expect(products[0].compliance.euroclass).toEqual({
      status: "PLACEHOLDER",
      value: "PLACEHOLDER",
      document: "PLACEHOLDER",
    });
  });

  it("groups rows that share a name into one product with multiple variants", () => {
    const csv =
      `${HEADER}\n` +
      `Garden Bollard,iluminacao-led,DMSL-12W,,,,,,,,,,12,240,,\n` +
      `Garden Bollard,iluminacao-led,DMSL-18W,,,,,,,,,,18,360,,`;
    const { products } = parseProductCsv(csv, opts);
    expect(products).toHaveLength(1);
    expect(products[0].variants).toEqual([
      { ref: "DMSL-12W", attrs: { power_w: 12, lumens: 240 } },
      { ref: "DMSL-18W", attrs: { power_w: 18, lumens: 360 } },
    ]);
  });

  it("splits images and applications on '|' into arrays", () => {
    const csv =
      `${HEADER}\nWall Light,pavimentos,DMWL-9W,,,,,a.jpg|b.jpg,caminhos|acessos,,,,,,,`;
    const { products } = parseProductCsv(csv, opts);
    expect(products[0].images).toEqual(["a.jpg", "b.jpg"]);
    expect(products[0].applications).toEqual(["caminhos", "acessos"]);
  });

  it("flags rows missing required fields or with an unknown category", () => {
    const csv =
      `${HEADER}\n` +
      `,iluminacao-led,DMSL-1,,,,,,,,,,,,,\n` + // missing name
      `Foo,not-a-cat,DMSL-2,,,,,,,,,,,,,\n` + // bad category
      `Bar,pavimentos,,,,,,,,,,,,,,`; // missing ref
    const { products, errors } = parseProductCsv(csv, opts);
    expect(products).toHaveLength(0);
    expect(errors.map((e) => e.row)).toEqual([1, 2, 3]);
    expect(errors[0].messages.join(" ")).toMatch(/name/i);
    expect(errors[1].messages.join(" ")).toMatch(/category/i);
    expect(errors[2].messages.join(" ")).toMatch(/ref/i);
  });

  it("flags non-numeric numeric fields", () => {
    const csv = `${HEADER}\nGarden,iluminacao-led,DMSL-12W,,,,,,,abc,,,,,,`;
    const { errors } = parseProductCsv(csv, opts);
    expect(errors).toHaveLength(1);
    expect(errors[0].messages.join(" ")).toMatch(/ip_rating/i);
  });

  it("dedupes generated slugs within the batch and against existing slugs", () => {
    const csv =
      `${HEADER}\n` +
      `Bollard,iluminacao-led,A-1,,,,,,,,,,,,,\n` +
      `Bollard,pavimentos,B-1,,,,,,,,,,,,,`; // same name, different category -> distinct product
    const { products } = parseProductCsv(csv, { validCategories: CATS, existingSlugs: new Set(["bollard"]) });
    // first group collides with existing "bollard" -> bollard-2; second distinct group -> bollard-3
    expect(products.map((p) => p.id).sort()).toEqual(["bollard-2", "bollard-3"]);
  });

  it("handles RFC-4180 quoting (commas and quotes inside quoted fields)", () => {
    const csv = `${HEADER}\n"Light, Big",iluminacao-led,DMSL-1,,,,"Says ""hi"", ok",,,,,,,,`;
    const { products, errors } = parseProductCsv(csv, opts);
    expect(errors).toEqual([]);
    expect(products[0].name).toBe("Light, Big");
    expect(products[0].description_pt).toBe('Says "hi", ok');
  });

  it("ignores blank lines", () => {
    const csv = `${HEADER}\n\nGarden,iluminacao-led,DMSL-1,,,,,,,,,,,,,\n\n`;
    const { products, errors } = parseProductCsv(csv, opts);
    expect(errors).toEqual([]);
    expect(products).toHaveLength(1);
  });
});
