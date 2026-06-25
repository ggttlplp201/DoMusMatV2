/**
 * cameraTrack — a tiny non-reactive singleton holding the player's current
 * floor position + facing. Written every frame by <CameraTracker> (inside the
 * Canvas) and read by the DOM <Minimap> via its own rAF loop, so neither one
 * triggers a React re-render per frame.
 */
export const cameraMini = {
  x: 0,   // world X (m)
  z: 1,   // world Z (m)
  dx: 0,  // facing direction X (normalised)
  dz: -1, // facing direction Z (normalised)
};
