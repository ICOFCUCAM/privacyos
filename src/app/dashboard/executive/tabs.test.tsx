// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/executive/doxxing" }));

import { ExecutiveTabs, EXECUTIVE_TABS } from "./tabs";

afterEach(cleanup);

describe("<ExecutiveTabs>", () => {
  it("renders every executive tab and marks the active one", () => {
    render(<ExecutiveTabs />);
    for (const t of EXECUTIVE_TABS) expect(screen.getByText(t.label)).toBeTruthy();
    const active = screen.getByText("Doxxing").closest("a") as HTMLAnchorElement;
    expect(active.className).toMatch(/text-white/);
  });
});
