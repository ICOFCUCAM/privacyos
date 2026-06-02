// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { ReputationScanButton } from "@/components/reputation-scan-button";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("<ReputationScanButton>", () => {
  it("renders the CTA and POSTs to /api/reputation/scan", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ReputationScanButton />);
    expect(screen.getByText("Run reputation scan")).toBeTruthy();
    fireEvent.click(screen.getByText("Run reputation scan"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/reputation/scan", { method: "POST" }));
  });
});
