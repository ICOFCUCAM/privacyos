import { describe, it, expect } from "vitest";
import { buildSuiteSeedRows, SEED_TABLES, SAMPLE_SOURCE } from "./suite-seed";

describe("buildSuiteSeedRows", () => {
  const rows = buildSuiteSeedRows("user-1", "subj-1");

  it("produces a row set for every seed table", () => {
    for (const t of SEED_TABLES) {
      expect(Array.isArray(rows[t])).toBe(true);
    }
    expect(rows.family_profiles.length).toBe(SAMPLE_SOURCE.family.length);
    expect(rows.third_party_risks.length).toBe(SAMPLE_SOURCE.vendors.length);
  });

  it("scopes every row to the user and (where applicable) the subject", () => {
    for (const t of SEED_TABLES) {
      for (const row of rows[t]) {
        expect(row.user_id).toBe("user-1");
      }
    }
    // subject-scoped tables carry subject_id; org-scoped ones don't
    expect(rows.family_profiles[0].subject_id).toBe("subj-1");
    expect(rows.mentions[0].subject_id).toBe("subj-1");
    expect(rows.employee_exposures[0]).not.toHaveProperty("subject_id");
    expect(rows.third_party_risks[0]).not.toHaveProperty("subject_id");
  });

  it("omits ids and maps to snake_case columns", () => {
    const fam = rows.family_profiles[0];
    expect(fam).not.toHaveProperty("id");
    expect(fam).toHaveProperty("display_name");
    expect(fam).toHaveProperty("is_minor");
    const cred = rows.credential_leaks[0];
    expect(cred).toHaveProperty("breach_name");
    expect(Array.isArray(cred.data_classes)).toBe(true);
  });

  it("preserves nullable fields as null, not undefined", () => {
    const seed = buildSuiteSeedRows("u", "s", {
      ...SAMPLE_SOURCE,
      travel: [{ id: "t", subjectId: "s", destination: "X", riskLevel: "low", advisory: "" }],
    });
    expect(seed.travel_alerts[0].travel_date).toBeNull();
  });
});
