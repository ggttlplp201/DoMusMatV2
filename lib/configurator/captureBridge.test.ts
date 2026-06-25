import { describe, it, expect, beforeEach } from "vitest";
import { registerCaptureHandler, runCapture } from "./captureBridge";

describe("captureBridge", () => {
  beforeEach(() => registerCaptureHandler(null));

  it("throws when no handler is registered", async () => {
    await expect(runCapture([], 64)).rejects.toThrow("capture handler not ready");
  });

  it("delegates to the registered handler", async () => {
    registerCaptureHandler(async (spots) => {
      const out: Record<string, Blob> = {};
      for (const s of spots) out[s.id] = new Blob([s.id]);
      return out;
    });
    const res = await runCapture([{ id: "living", label: "L", pos: [0, 0, 0] }], 64);
    expect(Object.keys(res)).toEqual(["living"]);
  });
});
