import { create } from "zustand";
import type { SceneDocument, PlacedItem, SurfaceDef, ProductMeta } from "@/lib/configurator/types";
import { emptyScene } from "@/lib/configurator/types";
import { snapPos, wallRotY, isAllowedSurface } from "@/lib/configurator/geometry";

export type Tool =
  | { kind: "look" }
  | { kind: "paint"; material: string }
  | { kind: "place"; ref: string };

export type LightType = "none" | "ceiling";
export interface LightConfig { type: LightType; count: number; }

let idCounter = 0;
export function __resetItemIds() { idCounter = 0; } // tests only

interface ConfiguratorState {
  scene: SceneDocument;
  tool: Tool;
  selectedId: string | null;
  editingId: string | null;
  timeOfDay: number;                 // hours, 6..20 (drives the sun direction)
  roomLights: Record<string, LightConfig>;  // per-zone interior lighting
  showLightHelpers: boolean;         // reveal light-direction helpers
  loadScene(doc: SceneDocument): void;
  setTool(tool: Tool): void;
  paintSurface(surfaceId: string, materialId: string): void;
  /** returns the new item id, or null if the surface is disallowed */
  placeItem(meta: ProductMeta, surface: SurfaceDef, point: [number, number, number]): string | null;
  moveItem(id: string, surface: SurfaceDef, point: [number, number, number]): void;
  rotateItem(id: string, deltaY: number): void;
  deleteItem(id: string): void;
  select(id: string | null): void;
  beginEdit(id: string): void;
  saveEdit(): void;
  escape(): void;
  /** fill a preset slot with a product ref */
  assignSlot(slotId: string, ref: string): void;
  clearSlot(slotId: string): void;
  setTimeOfDay(hours: number): void;
  setRoomLight(zoneId: string, cfg: LightConfig): void;
  setShowLightHelpers(v: boolean): void;
}

export const useConfigurator = create<ConfiguratorState>((set) => ({
  scene: emptyScene("house-40x30"),
  tool: { kind: "look" },
  selectedId: null,
  editingId: null,
  timeOfDay: 9,
  roomLights: { living: { type: "ceiling", count: 6 } },
  showLightHelpers: false,

  loadScene: (doc) => set({ scene: doc, selectedId: null, editingId: null, tool: { kind: "look" } }),
  setTool: (tool) => set({ tool, selectedId: null }),

  paintSurface: (surfaceId, materialId) =>
    set((st) => ({ scene: { ...st.scene, surfaces: { ...st.scene.surfaces, [surfaceId]: materialId } } })),

  placeItem: (meta, surface, point) => {
    if (!isAllowedSurface(meta, surface.kind)) return null;
    const id = `item-${++idCounter}`;
    const item: PlacedItem = {
      id, ref: meta.ref, surface: surface.id,
      pos: snapPos(surface, point),
      rotY: surface.kind === "wall" ? wallRotY(surface) : 0,
    };
    set((st) => ({ scene: { ...st.scene, items: [...st.scene.items, item] }, selectedId: id }));
    return id;
  },

  moveItem: (id, surface, point) =>
    set((st) => ({
      scene: { ...st.scene, items: st.scene.items.map((it) =>
        it.id === id
          ? { ...it, surface: surface.id, pos: snapPos(surface, point), rotY: surface.kind === "wall" ? wallRotY(surface) : it.rotY }
          : it) },
    })),

  rotateItem: (id, deltaY) =>
    set((st) => ({ scene: { ...st.scene, items: st.scene.items.map((it) => it.id === id ? { ...it, rotY: it.rotY + deltaY } : it) } })),

  deleteItem: (id) =>
    set((st) => ({
      scene: { ...st.scene, items: st.scene.items.filter((it) => it.id !== id) },
      selectedId: st.selectedId === id ? null : st.selectedId,
      editingId: st.editingId === id ? null : st.editingId,
    })),

  select: (id) => set({ selectedId: id }),
  beginEdit: (id) => set({ editingId: id, selectedId: id, tool: { kind: "look" } }),
  saveEdit: () => set({ editingId: null, selectedId: null }),
  escape: () => set((st) => st.editingId ? { editingId: null, selectedId: null } : { tool: { kind: "look" }, selectedId: null }),

  assignSlot: (slotId, ref) =>
    set((st) => ({ scene: { ...st.scene, slots: { ...(st.scene.slots ?? {}), [slotId]: ref } } })),
  clearSlot: (slotId) =>
    set((st) => {
      const slots = { ...(st.scene.slots ?? {}) };
      delete slots[slotId];
      return { scene: { ...st.scene, slots } };
    }),

  setTimeOfDay: (hours) => set({ timeOfDay: hours }),
  setRoomLight: (zoneId, cfg) => set((st) => ({ roomLights: { ...st.roomLights, [zoneId]: cfg } })),
  setShowLightHelpers: (v) => set({ showLightHelpers: v }),
}));
