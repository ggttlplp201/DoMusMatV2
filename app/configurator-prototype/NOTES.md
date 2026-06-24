# Configurator prototype — verdict log

**Status:** THROWAWAY. Delete once the verdict below is filled in and folded into the spec.

## Question
Do the two core configurator mechanics feel right, using primitives only (no GLB assets yet)?
1. "Click & walk" camera — click floor to walk there, drag to look.
2. Assign materials/items to a preset empty room — paint a surface, place/move/rotate/delete an item, with an `allowedSurfaces` rule (wall panel only mounts on walls).

## What it proves (and what it doesn't)
- Proves: interaction *feel*, the scene-document data model (see live JSON dump), surface-targeting, snap/allowed-surface rule.
- Does NOT prove: real asset loading/perf, lighting quality, mobile, true room geometry, BOM.

## Verdict — APPROVED (2026-06-23)
Mechanics validated. Carry this interaction model into the real build when polishing.

**Camera ("click & walk")**
- Drag to look: horizontal drag-right → look-right; vertical drag-down → look-down (both axes
  use the "grab the world" sense, NOT inverted-FPS). Sensitivity = 0.003 rad/px (tune later).
- Click floor → smoothly walk to that point (position lerp 0.18, eye height 1.6m, clamped 0.4m off walls).

**Authoring**
- Materials: select swatch → click any surface to repaint it.
- Items: select item → click a *valid* surface (allowedSurfaces rule; wall panel rejects floor).
  Stays in "add" mode for repeated placement.
- **Esc** exits add/paint (and edit) mode → returns to Walk/look.

**Move (the key validated flow)**
- Single-click item → select (white ring).
- **Double-click item → LOCKED move mode**: camera look + walk freeze, ring turns green, banner shows.
  Drag the item to reposition — works on floor AND walls (snap + orientation recomputed from the
  surface under the cursor). Rotate (R) / Delete (⌫) available.
- **Save ✓** commits and unlocks look/walk.

**Open tuning Qs (decide during polish, not blocking):** walk speed/lerp, look sensitivity,
camera height; drag-anywhere-on-surface vs must-grab-the-object-first.

**Data model proven:** the live `sceneDoc` JSON (room + surfaces map + items[]) is the real product;
3D is just a view of it. Real build: move this store into Zustand.

→ This prototype has served its purpose. It can be deleted once the above is folded into the spec.
