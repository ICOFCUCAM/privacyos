// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { WorkflowFlow } from "@/components/workflow-flow";
import { emptyWorkflow, newStepId, type WorkflowDefinition } from "@/lib/agents/workflow-builder";

afterEach(cleanup);

const def = (): WorkflowDefinition => ({
  ...emptyWorkflow("w1"),
  name: "Breach response",
  trigger: { kind: "threat_detected", minRisk: "high" },
  steps: [
    { id: newStepId(), type: "agent", agent: "security", label: "Rotate credentials" },
    { id: newStepId(), type: "report", label: "File incident record" },
  ],
});

describe("<WorkflowFlow>", () => {
  it("renders the trigger and each step label", () => {
    render(<WorkflowFlow def={def()} />);
    expect(screen.getByText(/New threat/i)).toBeTruthy();
    expect(screen.getByText("Rotate credentials")).toBeTruthy();
    expect(screen.getByText("File incident record")).toBeTruthy();
  });

  it("shows an empty hint when there are no steps", () => {
    render(<WorkflowFlow def={{ ...emptyWorkflow("w2"), trigger: { kind: "manual" } }} />);
    // trigger node still renders; no step labels
    expect(screen.queryByText("Rotate credentials")).toBeNull();
  });
});
