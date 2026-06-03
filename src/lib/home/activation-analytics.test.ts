import { describe, it, expect } from "vitest";
import { activationFunnel, type ActivationEvent } from "./activation-analytics";

const ev = (stage: ActivationEvent["stage"], over: Partial<ActivationEvent> = {}): ActivationEvent => ({
  stage, at: Date.now(), ...over,
});

describe("activation funnel", () => {
  it("computes the funnel + conversion rates", () => {
    const events: ActivationEvent[] = [
      ev("scan"), ev("scan"), ev("scan"), ev("scan"),               // 4 scans
      ev("revealed", { ttffMs: 2000, findings: 10 }),
      ev("revealed", { ttffMs: 4000, findings: 8 }),
      ev("revealed", { ttffMs: 3000, findings: 12 }),                // 3 revealed
      ev("consent_viewed"), ev("consent_viewed"),                    // 2 consent views
      ev("activated", { mode: "autopilot" }),                        // 1 activated
    ];
    const f = activationFunnel(events);
    expect(f.scans).toBe(4);
    expect(f.revealed).toBe(3);
    expect(f.consentViewed).toBe(2);
    expect(f.activated).toBe(1);
    expect(f.revealRate).toBe(75);      // 3/4
    expect(f.consentRate).toBe(33);     // 1/3 (activated ÷ revealed)
    expect(f.activationRate).toBe(25);  // 1/4
  });

  it("computes time-to-first-finding median + p90", () => {
    const events = [10, 20, 30, 40, 100].map((ttffMs) => ev("revealed", { ttffMs }));
    const f = activationFunnel([ev("scan"), ...events]);
    expect(f.ttffMedianMs).toBe(30);
    expect(f.ttffP90Ms).toBe(100);
  });

  it("handles an empty funnel without dividing by zero", () => {
    const f = activationFunnel([]);
    expect(f).toMatchObject({ scans: 0, revealRate: 0, consentRate: 0, activationRate: 0, ttffMedianMs: 0 });
  });
});
