import { describe, it, expect } from "vitest";
import { generateLegalDoc, LEGAL_TYPE_LABELS, type LegalDocInput } from "./engine";
import type { LegalRequestType } from "@/lib/suite-types";

const base: LegalDocInput = {
  type: "gdpr_erasure",
  subjectName: "Jordan Avery",
  recipient: "Spokeo, Inc.",
  matter: "home address listing",
  jurisdiction: "EU",
  contactEmail: "jordan@x.com",
};

describe("legal document engine", () => {
  it("generates a titled, addressed doc for each request type", () => {
    const types: LegalRequestType[] = [
      "gdpr_erasure", "ccpa_delete", "broker_optout", "defamation_complaint", "platform_abuse", "privacy_violation",
    ];
    for (const type of types) {
      const doc = generateLegalDoc({ ...base, type });
      expect(doc.type).toBe(type);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.body).toContain("Jordan Avery");
      expect(doc.body).toContain("Spokeo, Inc.");
    }
  });

  it("uses the right statutory framing per type", () => {
    expect(generateLegalDoc({ ...base, type: "gdpr_erasure" }).title).toBe(LEGAL_TYPE_LABELS.gdpr_erasure);
    expect(generateLegalDoc({ ...base, type: "ccpa_delete", jurisdiction: "US-CA" }).body.toLowerCase()).toMatch(/ccpa|california/);
  });
});
