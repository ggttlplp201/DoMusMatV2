# Default floor plan — modeling reference (slice A)

Canonical reference for the **default preset room** GLB. Source: user-supplied
floor-plan image (single-storey house), 2026-06-23.

## Overall

- Footprint: **40′ × 30′** = **12.19 m × 9.14 m** (x = 40′ width, z = 30′ depth).
- Ceiling height: **not specified → assume 2.7 m (≈9′)** until confirmed.
- Single storey, slab floor, flat ceiling.

## Room schedule

| Room | Plan size | Notes / fixtures |
|---|---|---|
| Bedroom #2 | 9′-0″ × 12′-0″ | NW corner; window on exterior wall; interior door + closet swing. |
| Bedroom #3 | 9′-0″ × 12′-0″ | top-middle; window; interior door. |
| Bathroom | (small, between Bedroom #3 & Master) | toilet, vanity/sink, shower/tub (hatched). |
| Master Bedroom | 12′-8″ × 12′-0″ | NE corner; window; door to closet. |
| Closet | 6′-0″ × 7′-0″ | off master / between master & washroom. |
| Family Room | 15′-0″ × 16′-4″ | SW; open-plan with dining; sofa zone; window; exterior door. |
| Dining Area | 9′-0″ × 16′-4″ | center-south; open-plan. |
| Kitchen | 8′-6″ × 16′-4″ | center/SE; island + counter + sink (open-plan with dining). |
| Washroom | (small, SE) | washer + dryer (W/D), sink; exterior door. |

Family Room + Dining Area + Kitchen are **one open-plan space** (no dividing
walls) — model as continuous, but expose them as **separate floor zones** so
finishes can differ by area.

## Named surface meshes the GLB must expose

The scene-document `surfaces` map is keyed by these mesh names. **Floors are
split per-room** (different flooring per area is the whole point).

- Floors: `floor-bedroom2`, `floor-bedroom3`, `floor-master`, `floor-bathroom`,
  `floor-closet`, `floor-family`, `floor-dining`, `floor-kitchen`, `floor-washroom`.
- Ceiling: one `ceiling` to start (split per-room later if needed).
- Walls: per-segment, e.g. `wall-bedroom2-n`, `wall-bedroom2-e`, … Naming is
  defined by the GLB; each named wall mesh is a paintable zone.
- Door/window openings: cut into wall meshes (no fill), so they read as openings
  and items can't be placed over them.

## Implications carried into the spec

- **Navigation:** multi-room → interior walls. Click-walk keeps the destination
  valid (you can only click floors you can see; raycast stops at walls). The
  straight-line walk path may clip a corner — acceptable for MVP; nav-mesh /
  pathfinding is a later refinement.
- **Per-room finishes:** per-room floor meshes enable "different materials in
  different areas" directly.
- **Open-plan zones:** family/dining/kitchen share space but are distinct floor
  zones for material assignment.

## Open question for the client

- Confirm **ceiling height** (assumed 2.7 m).
- Confirm whether **built-in fixtures** in the plan (toilet, vanity, kitchen
  island/counters, W/D) are part of the *room shell* GLB, or are *placeable
  catalogue items*. Default assumption: model them as part of the shell (fixed),
  since they define the rooms; placeable items are the catalogue products on top.
```
