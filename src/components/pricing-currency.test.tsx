// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { PricingTable } from "@/components/pricing";

afterEach(cleanup);

describe("<PricingTable> multi-currency", () => {
  it("offers a currency switcher and prices default in USD", () => {
    render(<PricingTable />);
    const select = screen.getByLabelText(/Select currency/i) as HTMLSelectElement;
    expect(select).toBeTruthy();
    // at least 10 currency options incl. the requested ones
    const codes = Array.from(select.options).map((o) => o.value);
    expect(codes.length).toBeGreaterThanOrEqual(10);
    for (const c of ["usd", "gbp", "cad", "nok", "eur"]) expect(codes).toContain(c);
    // a USD price is shown
    expect(screen.getAllByText(/^\$\d/).length).toBeGreaterThan(0);
  });

  it("re-prices in the selected currency", () => {
    render(<PricingTable />);
    fireEvent.change(screen.getByLabelText(/Select currency/i), { target: { value: "gbp" } });
    // pounds now appear, and the indicative-charge note shows
    expect(screen.getAllByText(/£/).length).toBeGreaterThan(0);
    expect(screen.getByText(/charged in GBP at checkout/i)).toBeTruthy();
  });
});
