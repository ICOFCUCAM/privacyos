// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

vi.mock("./actions", () => ({
  generateWorkflowAction: vi.fn(async () => ({})),
  saveGeneratedWorkflowAction: vi.fn(async () => {}),
}));

import { WorkflowGenerator } from "./generator";

afterEach(cleanup);

describe("<WorkflowGenerator>", () => {
  it("renders the prompt box, example chips and a disabled Generate until typed", () => {
    render(<WorkflowGenerator />);
    expect(screen.getByText(/Describe what you want to protect/i)).toBeTruthy();
    expect(screen.getByText("Protect my CEO from doxxing.")).toBeTruthy();
    const btn = screen.getByText("Generate").closest("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true); // nothing typed yet
  });

  it("offers the canonical example prompts", () => {
    render(<WorkflowGenerator />);
    expect(screen.getByText("Remove my data from data brokers.")).toBeTruthy();
    expect(screen.getByText("Protect my family's privacy online.")).toBeTruthy();
  });
});
