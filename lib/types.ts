import raw from "@/data/product_data.json";

export type Placeholder = "PLACEHOLDER";
export const PLACEHOLDER: Placeholder = "PLACEHOLDER";

export interface Category {
  id: string;
  name: string;
}

export interface Variant {
  ref: string;
  attrs: Record<string, string | number>;
}

export type BimAssetFormat = "IFC" | "RFA" | "PLA" | "DWG" | "GLB" | "STL" | "PDF" | "IES" | "LDT";

export interface BimAsset {
  format: BimAssetFormat;
  label: string;
  file: string;
  size: string;
  primary: boolean;
}

export interface ComplianceField {
  status: string;
  value: string;
  document: string;
}

export interface Compliance {
  ce: ComplianceField;
  dop: ComplianceField;
  euroclass: ComplianceField;
  voc: ComplianceField;
  epd: ComplianceField;
  acoustic: ComplianceField;
  dpp: ComplianceField;
}

export interface Installation {
  instructions: string;
  mounting_nodes: string;
  document: string;
}

export interface Standardization {
  price_range: string;
  delivery_period: string;
  maintenance_cycle: string;
  installation: Installation;
}

export interface DeliveryNode {
  label: string;
  status: string;
  eta: string;
}

export interface SupplyChain {
  stock: string;
  delivery_nodes: DeliveryNode[];
}

export interface BimMetadata {
  product_id: string;
  dimensions: Record<string, string | number>;
  materials: string[];
  performance: Record<string, string | number>;
  ifc_properties: Record<string, string>;
  version: string;
  version_history: Array<{ version: string; date: string; notes: string }>;
}

export interface Product {
  id: string;
  category: string;
  name: string;
  ref_prefix: string;
  description_pt: string;
  description_en: string;
  applications: string[];
  images: string[];
  shared_specs: Record<string, unknown>;
  variants: Variant[];
  model3d: string;
  compliance: Compliance;
  bim_assets: BimAsset[];
  bim_metadata: BimMetadata;
  standardization: Standardization;
  supply_chain: SupplyChain;
}

export interface Commercial {
  currency: string;
  unit_prices: Record<string, string>;
  volume_discount_tiers: string;
  lead_time_tiers: string;
  minimum_order_quantity: string;
}

export interface Catalogue {
  manufacturer: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  categories: Category[];
  products: Product[];
  commercial: Commercial;
}

export const catalogue = raw as unknown as Catalogue;
