// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("./actions", () => ({
  saveWorkflowAction: vi.fn(async () => {}),
  deleteWorkflowAction: vi.fn(async () => {}),
  toggleWorkflowAction: vi.fn(async () => {}),
}));

import { WorkflowBuilder } from "./builder";

afterEach(cleanup);

const agents = ["discovery", "security", "legal"] as const;

describe("<WorkflowBuilder> three-panel designer", () => {
  it("renders the toolbox, canvas and configuration panels", () => {
    render(<WorkflowBuilder initial={[]} agents={[...agents]} />);
    expect(screen.getByText("Toolbox")).toBeTruthy();
    expect(screen.getByText("Canvas")).toBeTruthy();
    expect(screen.getByText("Configuration")).toBeTruthy();
    expect(screen.getByText("Triggers")).toBeTruthy();
    // empty canvas hint
    expect(screen.getByText(/Drag blocks from the toolbox/i)).toBeTruthy();
  });

  it("adds a block when an agent is clicked in the toolbox", () => {
    render(<WorkflowBuilder initial={[]} agents={[...agents]} />);
    // the toolbox lists agents by label; click Legal Agent to add it
    const legalButtons = screen.getAllByText("Legal Agent");
    fireEvent.click(legalButtons[0]);
    // the empty hint is gone and the right panel now configures the selected block
    expect(screen.queryByText(/Drag blocks from the toolbox/i)).toBeNull();
    expect(screen.getByText("Assigned agent")).toBeTruthy();
  });
});
