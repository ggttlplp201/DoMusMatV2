export type AnalyticsEventType = "view" | "add_to_bom" | "add_to_quote" | "download";
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  ref: string;
  category?: string;
  region?: string;
  ts: number;
}
export interface AnalyticsSink {
  track(e: Omit<AnalyticsEvent, "ts">): void;
  all(): AnalyticsEvent[];
}

const KEY = "dmm.analytics";
// Phase 2: swap for SupabaseAnalyticsSink (same interface) to aggregate
// selection frequency, project-category demand, and regional differences server-side.
export class LocalAnalyticsSink implements AnalyticsSink {
  all(): AnalyticsEvent[] {
    if (typeof localStorage === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  }
  track(e: Omit<AnalyticsEvent, "ts">): void {
    if (typeof localStorage === "undefined") return;
    const event: AnalyticsEvent = { region: "PLACEHOLDER", ...e, ts: Date.now() };
    const next = [...this.all(), event];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }
}
