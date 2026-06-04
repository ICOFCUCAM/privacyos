import { describe, it, expect } from "vitest";
import { remediationLedger, remediationSection, evidenceSection } from "./remediation";
import { actionEvidence, type EvidenceItem } from "@/lib/intelligence/evidence-vault";
import type { AgentAction, LegalRequest } from "@/lib/suite-types";
import type { Case, RemovalRequest } from "@/lib/types";

const evidence: EvidenceItem[] = [
  actionEvidence({ subjectId: "s", action: "Filed broker opt-out: Spokeo", detail: "x", source: "Spokeo", riskLevel: "medium", collectedBy: "privacy", collectedAt: "2026-05-04T00:00:00Z" }),
  actionEvidence({ subjectId: "s", action: "Drafted GDPR erasure", detail: "y", source: "Legal Agent", riskLevel: "high", collectedBy: "legal", collectedAt: "2026-05-05T00:00:00Z" }),
];

const legalRequests: LegalRequest[] = [
  { id: "l1", subjectId: "s", type: "defamation_complaint", recipient: "X", status: "draft", body: "b", createdAt: "", updatedAt: "" },
  { id: "l2", subjectId: "s", type: "gdpr_erasure", recipient: "Y", status: "submitted", body: "b", createdAt: "", updatedAt: "" },
];

const removals: RemovalRequest[] = [
  { id: "r1", subjectId: "s", brokerName: "Spokeo", status: "in_progress", submittedAt: "", history: [] },
  { id: "r2", subjectId: "s", brokerName: "Radaris", status: "removed", submittedAt: "", history: [] },
];

const agentActions: AgentAction[] = [
  { id: "a1", agent: "privacy", kind: "remove", summary: "filed", status: "completed", createdAt: "" },
  { id: "a2", agent: "discovery", kind: "scan", summary: "swept", status: "running", createdAt: "" },
];

const cases: Case[] = [
  { id: "c1", subjectId: "s", type: "reputation_recovery", title: "T", summary: "", status: "open", riskLevel: "high", assignedAgent: "reputation", relatedExposureIds: [], createdAt: "", updatedAt: "" },
  { id: "c2", subjectId: "s", type: "breach_response", title: "U", summary: "", status: "resolved", riskLevel: "critical", assignedAgent: "security", relatedExposureIds: [], createdAt: "", updatedAt: "" },
];

describe("remediationLedger", () => {
  it("rolls the real ledgers up correctly", () => {
    const l = remediationLedger({ evidence, legalRequests, removals, agentActions, cases });
    expect(l.evidenceSealed).toBe(2);
    expect(l.legalDrafted).toBe(1);     // draft
    expect(l.legalSubmitted).toBe(1);   // submitted
    expect(l.removalsFiled).toBe(1);    // in_progress
    expect(l.removalsRemoved).toBe(1);  // removed
    expect(l.casesOpen).toBe(1);
    expect(l.casesResolved).toBe(1);
    expect(l.actionsTaken).toBe(1);     // only completed
  });
});

describe("remediationSection", () => {
  it("renders the proof-of-work block", () => {
    const sec = remediationSection(remediationLedger({ evidence, legalRequests, removals, agentActions, cases }));
    expect(sec.heading).toBe("Remediation performed");
    expect(sec.rows.find((r) => r.label === "Evidence sealed (SHA-256)")!.value).toContain("2");
    expect(sec.rows.find((r) => r.label === "Broker removals")!.value).toBe("1 in flight · 1 removed");
  });
});

describe("evidenceSection", () => {
  it("lists sealed items with custodian + hash fingerprint", () => {
    const sec = evidenceSection(evidence);
    expect(sec.heading).toBe("Sealed evidence (chain of custody)");
    expect(sec.rows).toHaveLength(2);
    expect(sec.rows[0].value).toMatch(/…/); // shortHash fingerprint
  });

  it("collapses to a single line when the vault is empty", () => {
    const sec = evidenceSection([]);
    expect(sec.rows).toHaveLength(1);
    expect(sec.rows[0].label).toMatch(/No sealed evidence/);
  });
});
