import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SupabaseSerpMeter, currentPeriod } from "./serp-meter";

/* eslint-disable @typescript-eslint/no-explicit-any */
function fakeDb(result: { data?: unknown; error?: unknown }) {
  return { rpc: vi.fn(async () => result) } as any;
}

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("currentPeriod", () => {
  it("formats a UTC month-start key", () => {
    expect(currentPeriod(new Date("2026-06-15T12:00:00Z"))).toBe("2026-06-01");
  });
});

describe("SupabaseSerpMeter", () => {
  it("is uncapped for an infinite budget (no db call)", async () => {
    const db = fakeDb({ data: false });
    const m = new SupabaseSerpMeter(db, "u", Infinity);
    expect(await m.consume(5)).toBe(true);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("denies and trips once at a zero budget", async () => {
    const onTrip = vi.fn();
    const m = new SupabaseSerpMeter(fakeDb({ data: false }), "u", 0, "2026-06-01", onTrip);
    expect(await m.consume(1)).toBe(false);
    expect(await m.consume(1)).toBe(false);
    expect(onTrip).toHaveBeenCalledTimes(1); // fires once, not per call
  });

  it("reserves within budget, denies + trips over budget", async () => {
    const onTrip = vi.fn();
    const ok = new SupabaseSerpMeter(fakeDb({ data: true }), "u", 100, "2026-06-01", onTrip);
    expect(await ok.consume(3)).toBe(true);
    expect(onTrip).not.toHaveBeenCalled();

    const over = new SupabaseSerpMeter(fakeDb({ data: false }), "u", 100, "2026-06-01", onTrip);
    expect(await over.consume(3)).toBe(false);
    expect(onTrip).toHaveBeenCalledTimes(1);
  });

  it("fails open on a meter error (never blocks protection)", async () => {
    const m = new SupabaseSerpMeter(fakeDb({ error: { message: "boom" } }), "u", 100);
    expect(await m.consume(1)).toBe(true);
  });
});
