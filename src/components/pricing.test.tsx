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
});
