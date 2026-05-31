import { describe, it, expect } from "vitest";
import { caseFromRecommendation, type RecommendationLike } from "./recommendation-routing";

const rec = (over: Partial<RecommendationLike>): RecommendationLike => ({
  id: "r1", agent: "security", title: "Rotate exposed credentials now",
  rationale: "Critical leak on the dark web.", riskLevel: "critical", ...over,
});

describe("caseFromRecommendation", () => {
  it("routes the security agent to a breach-response case", () => {
    const c = caseFromRecommendation(rec({ agent: "security" }));
    expect(c.type).toBe("breach_response");
    expect(c.assignedAgent).toBe("security");
    expect(c.title).toBe("Rotate exposed credentials now");
    expect(c.riskLevel).toBe("critical");
  });

  it("routes reputation -> recovery, deepfake -> incident, legal -> request", () => {
    expect(caseFromRecommendation(rec({ agent: "reputation" })).type).toBe("reputation_recovery");
    expect(caseFromRecommendation(rec({ agent: "deepfake" })).type).toBe("deepfake_incident");
    expect(caseFromRecommendation(rec({ agent: "legal" })).type).toBe("legal_request");
  });

  it("routes privacy/discovery to broker removal", () => {
    expect(caseFromRecommendation(rec({ agent: "privacy" })).type).toBe("data_broker_removal");
    expect(caseFromRecommendation(rec({ agent: "discovery" })).type).toBe("data_broker_removal");
  });

  it("maps the new coordination agents to a sensible case type", () => {
    expect(caseFromRecommendation(rec({ agent: "compliance" })).type).toBe("legal_request");
    expect(caseFromRecommendation(rec({ agent: "vendor" })).type).toBe("impersonation_takedown");
    expect(caseFromRecommendation(rec({ agent: "incident" })).type).toBe("breach_response");
  });

  it("carries the rationale into the case summary", () => {
    const c = caseFromRecommendation(rec({ rationale: "Home address exposed." }));
    expect(c.summary).toBe("Home address exposed.");
  });
});
