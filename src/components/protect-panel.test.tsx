// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProtectPanel } from "@/components/protect-panel";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("<ProtectPanel> autonomous run", () => {
  it("renders the one-click protect CTA", () => {
    render(<ProtectPanel />);
    expect(screen.getByText("Protect me")).toBeTruthy();
    expect(screen.getByText(/We handle the rest/i)).toBeTruthy();
  });

  it("calls /api/protect and shows the outcome", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      summary: "Handled 3 threats", scoreBefore: 40, scoreAfter: 70,
      agentStates: [{ kind: "security", name: "Security Agent", itemsHandled: 2, status: "done" }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ProtectPanel />);
    fireEvent.click(screen.getByText("Protect me"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/protect", { method: "POST" }));
  });
});
