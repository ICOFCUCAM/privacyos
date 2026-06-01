import { describe, it, expect } from "vitest";
import {
  buildAccounts, passwordHygiene, identityRisk, restorationPlaybook, identityOverview, riskBand,
} from "./identity-os";
import type { Exposure } from "@/lib/types";
import type { CredentialLeak } from "@/lib/suite-types";

const leak = (over: Partial<CredentialLeak>): CredentialLeak => ({
  id: Math.random().toString(36).slice(2), account: "ceo@corp.com", breachName: "MegaBreach",
  dataClasses: ["Emails"], pwnCount: 1000, riskLevel: "high", ...over,
});
const exposure = (over: Partial<Exposure>): Exposure => ({
  id: Math.random().toString(36).slice(2), subjectId: "s", category: "email", source: "breach_db", sourceName: "X",
  snippet: "", riskLevel: "medium", riskScore: 18, status: "discovered", discoveredAt: "", lastSeenAt: "", ...over,
});

describe("account inventory", () => {
  it("groups breaches per account and scores ATO risk, worst first", () => {
    const accts = buildAccounts({
      credentialLeaks: [
        leak({ account: "ceo@corp.com", dataClasses: ["Passwords"], riskLevel: "critical" }),
        leak({ account: "ceo@corp.com", dataClasses: ["Emails"] }),
        leak({ account: "assist@corp.com", dataClasses: ["Emails"], riskLevel: "low" }),
      ],
      exposures: [exposure({ source: "dark_web" })],
      knownEmails: ["clean@corp.com"],
    });
    const ceo = accts.find((a) => a.account === "ceo@corp.com")!;
    expect(ceo.breaches).toBe(2);
    expect(ceo.passwordExposed).toBe(true);
    expect(ceo.darkWeb).toBe(true);                 // dark-web exposure present
    expect(accts[0].account).toBe("ceo@corp.com");  // highest ATO first
    // the clean known account is present with zero risk
    expect(accts.find((a) => a.account === "clean@corp.com")!.atoRisk).toBe(0);
  });
});

describe("password hygiene", () => {
  it("flags password exposure + reuse and scores inversely", () => {
    const accts = buildAccounts({
      credentialLeaks: [
        leak({ account: "a@x.com", dataClasses: ["Passwords"] }),
        leak({ account: "a@x.com", dataClasses: ["Passwords"] }), // reuse (2 breaches)
        leak({ account: "b@x.com", dataClasses: ["Emails"] }),
      ],
      exposures: [],
    });
    const h = passwordHygiene(accts);
    expect(h.accountsWithPasswords).toBe(1);
    expect(h.reuseRisk).toBe(1);
    expect(h.score).toBeLessThan(100);
  });
  it("is perfect with no breaches", () => {
    expect(passwordHygiene(buildAccounts({ credentialLeaks: [], exposures: [], knownEmails: ["x@y.com"] })).score).toBe(100);
  });
});

describe("identity risk + playbook + overview", () => {
  it("scores identity risk and bands it", () => {
    const accts = buildAccounts({ credentialLeaks: [leak({ dataClasses: ["Passwords"], riskLevel: "critical" })], exposures: [exposure({ source: "dark_web" })] });
    const r = identityRisk(accts);
    expect(r.overall).toBeGreaterThan(0);
    expect(r.band).toBe(riskBand(r.overall));
    expect(r.breachedAccounts).toBe(1);
    expect(r.passwordsExposed).toBe(1);
  });
  it("restoration playbook escalates with risk", () => {
    const hot = restorationPlaybook({ overall: 80, band: "critical", breachedAccounts: 3, passwordsExposed: 2 });
    expect(hot[0].priority).toBe("critical");
    expect(hot).toHaveLength(5);
  });
  it("overview rolls up accounts/risk/hygiene; clean for no data", () => {
    expect(identityOverview({ credentialLeaks: [], exposures: [] })).toMatchObject({ accounts: 0, identityRisk: 0, band: "low", hygiene: 100 });
  });
});
