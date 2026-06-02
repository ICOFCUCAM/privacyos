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
    expect(screen.queryByText("Workflow Builder")).toBeNull();
    // the toggle is present
    expect(screen.getByText("Advanced tools")).toBeTruthy();
  });

  it("reveals operator surfaces when Advanced is toggled on", () => {
    render(<NavList />);
    fireEvent.click(screen.getByText("Advanced tools"));
    expect(screen.getByText("Mission Control")).toBeTruthy();
    expect(screen.getByText("Workflow Builder")).toBeTruthy();
    // the toggle flips its label
    expect(screen.getByText("Hide advanced tools")).toBeTruthy();
  });
});
