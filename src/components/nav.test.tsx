// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/home" }));

import { NavList } from "@/components/nav";

afterEach(cleanup);
beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

describe("<NavList> progressive disclosure", () => {
  it("shows the consumer surfaces and hides operator ones by default", () => {
    render(<NavList />);
    // consumer
    expect(screen.getByText("Protection")).toBeTruthy();
    expect(screen.getByText("Broker Removals")).toBeTruthy();
    expect(screen.getByText("Reports")).toBeTruthy();
    // operator/advanced hidden by default
    expect(screen.queryByText("Mission Control")).toBeNull();
    expect(screen.queryByText("AI Agents")).toBeNull();
    // the toggle is present
    expect(screen.getByText("Advanced tools")).toBeTruthy();
  });

  it("reveals operator surfaces when Advanced is toggled on", () => {
    render(<NavList />);
    fireEvent.click(screen.getByText("Advanced tools"));
    expect(screen.getByText("Mission Control")).toBeTruthy();
    expect(screen.getByText("AI Agents")).toBeTruthy();
    // the toggle flips its label
    expect(screen.getByText("Hide advanced tools")).toBeTruthy();
  });

  it("never shows the internal Growth & Revenue console to a non-operator, even under Advanced", () => {
    render(<NavList />);
    fireEvent.click(screen.getByText("Advanced tools"));
    expect(screen.queryByText("Growth & Revenue")).toBeNull();
  });

  it("shows the Growth & Revenue console only to operators", () => {
    render(<NavList isOperator />);
    fireEvent.click(screen.getByText("Advanced tools"));
    expect(screen.getByText("Growth & Revenue")).toBeTruthy();
  });
});
