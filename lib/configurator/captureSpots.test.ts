import { describe, it, expect } from "vitest";
import { computeCaptureSpots } from "./captureSpots";
import type { RoomShell } from "./types";

const baseRoom = (zones: RoomShell["lightZones"]): RoomShell => ({
  id: "r", surfaces: [], slots: [], fixtures: [], lightZones: zones,
  bounds: { min: [-6, -4], max: [6, 4] }, eyeHeight: 1.6, defaultMaterials: {},
});

describe("computeCaptureSpots", () => {
  it("makes one eye-height spot per light zone, centered", () => {
    const room = baseRoom([
      { id: "living", label: "Living", x0: 0, z0: 0, x1: 4, z1: 2, ceilingY: 3 },
      { id: "master", label: "Master", x0: -4, z0: -2, x1: -2, z1: 0, ceilingY: 3 },
    ]);
    const spots = computeCaptureSpots(room);
    expect(spots).toEqual([
      { id: "living", label: "Living", pos: [2, 1.6, 1] },
      { id: "master", label: "Master", pos: [-3, 1.6, -1] },
    ]);
  });

  it("falls back to one bounds-center spot when there are no zones", () => {
    const spots = computeCaptureSpots(baseRoom([]));
    expect(spots).toEqual([{ id: "center", label: "Room", pos: [0, 1.6, 0] }]);
  });
});
