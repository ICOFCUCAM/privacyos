// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/home" }));
vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn(async () => {}) }));

import { MobileNav } from "@/components/mobile-nav";

afterEach(cleanup);

describe("<MobileNav>", () => {
  it("exposes a menu toggle and renders the nav drawer with consumer surfaces", () => {
    render(<MobileNav subjectName="Jordan" live={false} />);
    const toggle = screen.getByLabelText(/Open navigation menu/i);
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle);
    // drawer content (shared NavList) shows the consumer surfaces
    expect(screen.getByText("Protection")).toBeTruthy();
    expect(screen.getByText("Broker Removals")).toBeTruthy();
  });
});
