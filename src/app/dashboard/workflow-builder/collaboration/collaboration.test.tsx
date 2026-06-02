// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";

vi.mock("./actions", () => ({ useCollaborationAction: vi.fn(async () => {}) }));

import { CollaborationExplorer } from "./collaboration";

afterEach(cleanup);

describe("<CollaborationExplorer>", () => {
  it("renders scenario tabs and the deepfake handoff chain", () => {
    render(<CollaborationExplorer />);
    // appears as both the tab and the active heading
    expect(screen.getAllByText("Deepfake Response").length).toBeGreaterThanOrEqual(2);
    // the multi-agent chain is shown
    expect(screen.getAllByText(/Threat Intelligence Agent/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Executive Protection Agent/).length).toBeGreaterThan(0);
    // the shared-context panel
    expect(screen.getByText(/Shared context/i)).toBeTruthy();
  });

  it("switches scenarios when another tab is selected", () => {
    render(<CollaborationExplorer />);
    fireEvent.click(screen.getByText("Doxxing Response"));
    // the doxxing chain involves the Discovery + Privacy agents
    expect(screen.getAllByText(/Discovery Agent/).length).toBeGreaterThan(0);
  });
});
