// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { PricingTable } from "@/components/pricing";

afterEach(cleanup);

describe("<PricingTable>", () => {
  it("renders plan tiers across categories", () => {
    render(<PricingTable />);
    expect(screen.getByText("PrivacyOS Starter")).toBeTruthy();
    expect(screen.getByText("PrivacyOS Family")).toBeTruthy();
    // an annual/monthly billing toggle
    expect(screen.getByText("Monthly")).toBeTruthy();
    expect(screen.getByLabelText(/Toggle annual billing/i)).toBeTruthy();
  });

  it("toggles billing cadence without crashing", () => {
    render(<PricingTable />);
    fireEvent.click(screen.getByLabelText(/Toggle annual billing/i));
    expect(screen.getByText("Monthly")).toBeTruthy(); // still rendered after toggle
  });

  it("highlights the plan deep-linked from the free scan", () => {
    render(<PricingTable recommendedPlanId="plus" />);
    // the scan's recommended plan gets a badge; others do not
    expect(screen.getByText(/Recommended from your scan/i)).toBeTruthy();
  });

  it("shows no scan recommendation when no plan is deep-linked", () => {
    render(<PricingTable />);
    expect(screen.queryByText(/Recommended from your scan/i)).toBeNull();
  });
});
