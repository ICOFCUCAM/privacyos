// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";

vi.mock("./actions", () => ({
  runScaryMirrorAction: vi.fn(async () => ({
    name: "Jordan", sourcesScanned: 64, totalFindings: 0, categoriesAffected: 0,
    exposureScore: 0, protectionScore: 100, headline: "clean", worst: null, findings: [], fixPlan: [],
    scanLog: ["Scanning…"],
  })),
  startProtectionAction: vi.fn(async () => {}),
  trackActivationAction: vi.fn(async () => {}),
}));

import { ScaryMirror } from "./mirror";

afterEach(cleanup);

describe("<ScaryMirror> activation flow", () => {
  it("renders the intro with the name prefilled and example prompts", () => {
    render(<ScaryMirror defaultName="Jordan Avery" defaultMode="autopilot" live={false} />);
    expect(screen.getByText(/See what.s exposed about you/i)).toBeTruthy();
    expect(screen.getByText("Scan my exposure")).toBeTruthy();
    const input = screen.getByPlaceholderText(/Jordan Avery/i) as HTMLInputElement;
    expect(input.value).toBe("Jordan Avery");
  });

  it("enters the scanning phase when the scan is started", () => {
    render(<ScaryMirror defaultName="Jordan Avery" defaultMode="autopilot" live={false} />);
    fireEvent.click(screen.getByText("Scan my exposure"));
    expect(screen.getByText("Scanning…")).toBeTruthy();
  });
});
