import { describe, it, expect, beforeEach } from "vitest";
import { LocalAnalyticsSink } from "./analytics";

beforeEach(() => localStorage.clear());
describe("LocalAnalyticsSink", () => {
  it("records events with a region placeholder and reads them back", () => {
    const sink = new LocalAnalyticsSink();
    sink.track({ type: "view", ref: "DMJR-TP200W003" });
    sink.track({ type: "add_to_bom", ref: "DMJR-TP200W003" });
    const all = sink.all();
    expect(all).toHaveLength(2);
    expect(all[0].type).toBe("view");
    expect(all[0].region).toBe("PLACEHOLDER");
  });
  it("persists across instances via localStorage", () => {
    new LocalAnalyticsSink().track({ type: "download", ref: "R9" });
    expect(new LocalAnalyticsSink().all().some(e => e.ref === "R9")).toBe(true);
  });
});
