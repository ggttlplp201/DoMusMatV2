import type { RoomShell } from "./types";

export interface CaptureSpot {
  id: string;
  label: string;
  pos: [number, number, number];
}

/** One panorama capture point per room (light zone), centered, at eye height.
 *  Falls back to a single bounds-center spot if the room has no zones. */
export function computeCaptureSpots(room: RoomShell): CaptureSpot[] {
  const y = room.eyeHeight;
  if (room.lightZones.length === 0) {
    const cx = (room.bounds.min[0] + room.bounds.max[0]) / 2;
    const cz = (room.bounds.min[1] + room.bounds.max[1]) / 2;
    return [{ id: "center", label: "Room", pos: [cx, y, cz] }];
  }
  return room.lightZones.map((z) => ({
    id: z.id,
    label: z.label,
    pos: [(z.x0 + z.x1) / 2, y, (z.z0 + z.z1) / 2],
  }));
}
