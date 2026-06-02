// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { ScanButton } from "@/components/scan-button";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("<ScanButton>", () => {
  it("renders the discovery CTA", () => {
    render(<ScanButton />);
    expect(screen.getByText("Run discovery scan")).toBeTruthy();
  });

  it("POSTs to /api/discover when clicked", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ found: 3 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ScanButton />);
    fireEvent.click(screen.getByText("Run discovery scan"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/discover", { method: "POST" }));
  });
});
