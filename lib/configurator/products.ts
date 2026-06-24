import type { ProductMeta } from "./types";

export interface MaterialTextureSet {
  color: string;        // *_Color.jpg (albedo)
  normal?: string;      // *_NormalGL.jpg
  roughness?: string;   // *_Roughness.jpg
  /** physical size (m) the texture tile represents, used for repeat tiling */
  repeatMeters: number;
}

export interface MaterialDef {
  id: string;
  name: string;
  color: string;                 // HUD swatch + fallback when no textures
  textures?: MaterialTextureSet; // PBR maps for real surfaces
}

export const MATERIALS: MaterialDef[] = [
  {
    id: "wallpaper", name: "Wallpaper", color: "#d8d2c8",
    textures: {
      color:     "/textures/Wallpaper001A_1K-JPG/Wallpaper001A_1K-JPG_Color.jpg",
      normal:    "/textures/Wallpaper001A_1K-JPG/Wallpaper001A_1K-JPG_NormalGL.jpg",
      roughness: "/textures/Wallpaper001A_1K-JPG/Wallpaper001A_1K-JPG_Roughness.jpg",
      repeatMeters: 2.0,
    },
  },
  { id: "marble-white", name: "Marble White", color: "#ECEAE4" },
  { id: "walnut",       name: "Walnut",       color: "#6B4A2B" },
  { id: "slate",        name: "Slate",        color: "#3A3F44" },
  { id: "sage",         name: "Sage",         color: "#9CAF88" },
  { id: "oak",          name: "Oak",          color: "#C9A36B" },
  // --- textured PBR materials (ambientCG sample sets) ---
  {
    id: "wood-093", name: "Wood Panel", color: "#9c6b3f",
    textures: {
      color:     "/textures/Wood093_1K-JPG/Wood093_1K-JPG_Color.jpg",
      normal:    "/textures/Wood093_1K-JPG/Wood093_1K-JPG_NormalGL.jpg",
      roughness: "/textures/Wood093_1K-JPG/Wood093_1K-JPG_Roughness.jpg",
      repeatMeters: 1.0,
    },
  },
  {
    id: "wood-floor-051", name: "Wood Floor", color: "#a9794b",
    textures: {
      color:     "/textures/WoodFloor051_1K-JPG/WoodFloor051_1K-JPG_Color.jpg",
      normal:    "/textures/WoodFloor051_1K-JPG/WoodFloor051_1K-JPG_NormalGL.jpg",
      roughness: "/textures/WoodFloor051_1K-JPG/WoodFloor051_1K-JPG_Roughness.jpg",
      repeatMeters: 1.5,
    },
  },
];

/** keyed by catalogue product `id` (see data/product_data.json).
 *  `sample: true` items are stand-in GLB assets that always appear in the
 *  playground palette (no cart entry needed) — swap for real DomusMat SKUs later. */
export const CONFIGURABLE_PRODUCTS: Record<string, ProductMeta> = {
  "balizador-de-jardim-led": { ref: "balizador-de-jardim-led", name: "LED Bollard", realDimsMm: { w: 100, h: 900, d: 100 }, allowedSurfaces: ["floor"] },

  "sample-door-frame":   { ref: "sample-door-frame",   name: "Door w/ Frame",     category: "door",     sample: true, modelUrl: "/models/door_with_frame.glb",         realDimsMm: { w: 900,  h: 2100, d: 150 }, allowedSurfaces: ["floor"] },
  "sample-metal-door":   { ref: "sample-metal-door",   name: "Metal Windowed Door", category: "door",   sample: true, modelUrl: "/models/modern_metal_windowed_door.glb", modelRotY: Math.PI / 2, realDimsMm: { w: 900, h: 2100, d: 150 }, allowedSurfaces: ["floor"] },
  "sample-fire-doors":   { ref: "sample-fire-doors",   name: "Fire Escape Doors", category: "door-double", sample: true, modelUrl: "/models/fire_escape__exit_doors.glb", realDimsMm: { w: 1800, h: 2100, d: 150 }, allowedSurfaces: ["floor"] },
  "sample-shoe-cabinet": { ref: "sample-shoe-cabinet", name: "Shoe Cabinet",      category: "cabinet",  sample: true, modelUrl: "/models/shoe_cabinet.glb",            realDimsMm: { w: 900,  h: 1000, d: 350 }, allowedSurfaces: ["floor"] },
  "sample-wardrobe":     { ref: "sample-wardrobe",     name: "Wardrobe",          category: "wardrobe", sample: true, modelUrl: "/models/wardrobe.glb",                realDimsMm: { w: 1200, h: 2000, d: 600 }, allowedSurfaces: ["floor"] },
};

/** Products that should always appear in the playground palette (sample assets). */
export const SAMPLE_PRODUCTS: ProductMeta[] = Object.values(CONFIGURABLE_PRODUCTS).filter((p) => p.sample);

/** Products that can fill a slot of the given category. */
export function productsForCategory(category: string): ProductMeta[] {
  return Object.values(CONFIGURABLE_PRODUCTS).filter((p) => p.category === category);
}
