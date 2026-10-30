export interface ProductDesign {
  schemaVersion: 1;
  kind: "bottle" | "sofa" | "freeform" | "assembly";
  units: "m";
  upAxis: "Y";
  frontAxis: "+Z";
  dimensions: { width: number; height: number; depth: number };
  scale: { confirmed: boolean; source: string };
  reconstruction?: { method: string; summary: string; confidence: number };
  shape: Record<string, unknown>;
  material: {
    type: string;
    color: string;
    roughness: number;
    metalness: number;
  };
  parts?: Record<
    string,
    { type?: string; color?: string; roughness?: number; metalness?: number }
  >;
  label: {
    text: string;
    assetId: string | null;
    width: number;
    height: number;
    y: number;
  };
  facts: {
    name: string;
    brand: string;
    sizeLabel: string;
    capacityMl: number | null;
    seating: number | null;
    price: number | null;
    currency: string;
  };
  figma: { fileUrl: string; nodeId: string | null };
}
export interface DesignRevision {
  id: string;
  designId: string;
  projectId: string;
  revision: number;
  document: ProductDesign;
  origin: string;
  createdAt: number;
}
export interface StoreLayout {
  template: "boutique" | "showroom";
  style?: "gallery" | "apothecary" | "stage" | "loft";
  width: number;
  depth: number;
  height: number;
  wallColor: string;
  floorColor: string;
  lighting: "daylight" | "warm" | "cool";
  sign: string;
  fixtures: Array<{
    id: string;
    x: number;
    z: number;
    rotation: number;
    width: number;
    height: number;
    depth: number;
  }>;
  placements: Array<{
    id: string;
    versionId: string;
    x: number;
    y: number;
    z: number;
    rotation: number;
  }>;
}
export interface Publication {
  id: string;
  projectId: string;
  name: string;
  layout: StoreLayout;
  versions: Array<{ id: string; name: string; document: ProductDesign }>;
  published: boolean;
}
export interface ShoppingSession {
  id: string;
  publicationId: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  lastSeen: number;
}
export interface ProductInteraction {
  id: string;
  roomId: string;
  instanceId: string;
  holder: string;
  expiresAt: number;
}
export interface PurchaseIntent {
  publicationId: string;
  versionId: string;
  intent: "yes" | "no" | "unsure";
  price: number;
  currency: string;
  comment: string;
}
