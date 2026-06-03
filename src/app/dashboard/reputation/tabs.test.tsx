// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/reputation/seo" }));

import { ReputationTabs, REPUTATION_TABS } from "./tabs";

afterEach(cleanup);

describe("<ReputationTabs>", () => {
  it("renders every tab and marks the active one", () => {
    render(<ReputationTabs />);
    for (const t of REPUTATION_TABS) {
      expect(screen.getByText(t.label)).toBeTruthy();
    }
    // active tab (SEO) carries the active styling
    const seo = screen.getByText("SEO").closest("a") as HTMLAnchorElement;
    expect(seo.className).toMatch(/text-white/);
    const overview = screen.getByText("Overview").closest("a") as HTMLAnchorElement;
    expect(overview.className).not.toMatch(/bg-brand\/15/);
  });
});
