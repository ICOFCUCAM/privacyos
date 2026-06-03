import { describe, expect, it } from "vitest";
import { runScheduledCycle } from "./run";
import { AGENT_COUNT } from "@/lib/agents/orchestrator";
import type {
  DomainScanData,
  Footprint,
  NewAgentAction,
  NewNotification,
  OwnedRemoval,
  ReputationData,
  ScoreEntry,
  SchedulerStore,
} from "./store";
import type { MentionSource } from "@/lib/reputation/collect";
import { DohClient } from "@/lib/domains/dns";
import type { RemovalRequest } from "@/lib/types";
import { createRemoval, isRemovalDue } from "@/lib/brokers/removal";
import { MockProvider } from "@/lib/agents/llm/provider";
import type { DiscoverySource } from "@/lib/discovery/source";
import type { Exposure, Recommendation, Subject, Threat } from "@/lib/types";
import type { ProtectOutcome } from "@/lib/agents/orchestrator";
import type { NewCaseFields } from "@/lib/agents/recommendation-routing";

function subject(id: string, userId: string): Subject {
  return {
    id,
    type: "individual",
    displayName: `User ${id}`,
    emails: [`${id}@example.com`],
    phones: [],
    usernames: [],
    createdAt: new Date().toISOString(),
  };
}

class MemoryStore implements SchedulerStore {
  constructor(
    private footprints: Footprint[],
    public removals: RemovalRequest[] = [],
  ) {}
  discovered: { exposures: Exposure[]; threats: Threat[] }[] = [];
  recs: Recommendation[][] = [];
  runs: ProtectOutcome[] = [];
  actions: NewAgentAction[][] = [];
  scores: ScoreEntry[][] = [];
  notifications: NewNotification[][] = [];
  savedRemovals: RemovalRequest[] = [];
  createdRemovals: Omit<RemovalRequest, "id">[] = [];
  investigations: { threatTitle: string; steps: { agent: string; label: string }[] }[] = [];
  reputation: ReputationData[] = [];
  domainScans: DomainScanData[] = [];
  createdCases: NewCaseFields[] = [];
  openCaseTitles: string[] = [];

  async listFootprints() {
    return this.footprints;
  }
  async listDueRemovals(now: string): Promise<OwnedRemoval[]> {
    return this.removals
      .filter((r) => isRemovalDue(r, now))
      .map((request) => ({ userId: "u1", request }));
  }
  async listRemovalsForSubject(_s: string): Promise<RemovalRequest[]> {
    return this.removals;
  }
  async recordInvestigation(_u: string, _s: string, threatTitle: string, steps: { agent: string; label: string }[]) {
    this.investigations.push({ threatTitle, steps });
  }
  async createRemovals(_u: string, _s: string, requests: Omit<RemovalRequest, "id">[]) {
    this.createdRemovals.push(...requests);
  }
  async saveRemoval(_u: string, request: RemovalRequest) {
    this.savedRemovals.push(request);
  }
  async saveDiscovered(_u: string, exposures: Exposure[], threats: Threat[]) {
    this.discovered.push({ exposures, threats });
  }
  async replaceRecommendations(_u: string, _s: string, recs: Recommendation[]) {
    this.recs.push(recs);
  }
  async recordRun(_u: string, outcome: ProtectOutcome) {
    this.runs.push(outcome);
  }
  async recordActions(_u: string, _s: string, actions: NewAgentAction[]) {
    this.actions.push(actions);
  }
  async recordScores(_u: string, _s: string, scores: ScoreEntry[]) {
    this.scores.push(scores);
  }
  async addNotifications(_u: string, notifs: NewNotification[]) {
    this.notifications.push(notifs);
  }
  async saveReputation(_u: string, _s: string, data: ReputationData) {
    this.reputation.push(data);
  }
  async saveDomainRisks(_u: string, data: DomainScanData) {
    this.domainScans.push(data);
  }
  async listOpenCaseTitlesForSubject(_s: string): Promise<string[]> {
    return this.openCaseTitles;
  }
  async createCases(_u: string, _s: string, cases: NewCaseFields[]) {
    this.createdCases.push(...cases);
  }
}

// Deterministic reputation source for tests (no network).
const repSource: MentionSource = {
  async fetch() {
    return {
      live: false,
      mentions: [
        { channel: "news", sourceName: "x.com", url: "r1", title: "Acme wins award", excerpt: "Acme wins award", detectedAt: "2026-01-02T00:00:00Z" },
        { channel: "news", sourceName: "y.com", url: "r2", title: "Acme faces lawsuit and scandal", excerpt: "Acme faces lawsuit and scandal", detectedAt: "2026-01-02T01:00:00Z" },
      ],
    };
  },
};

// Positive-only reputation source — never opens a reputation case.
const cleanRepSource: MentionSource = {
  async fetch() {
    return {
      live: false,
      mentions: [
        { channel: "news", sourceName: "x.com", url: "c1", title: "Acme wins award", excerpt: "Acme wins a great award", detectedAt: "2026-01-02T00:00:00Z" },
      ],
    };
  },
};

// Defamatory reputation source — should auto-open a reputation-recovery case.
const defamatoryRepSource: MentionSource = {
  async fetch() {
    return {
      live: false,
      mentions: [
        { channel: "news", sourceName: "bad.com", url: "d1", title: "Acme accused of fraud", excerpt: "Report alleges fraud and scam at Acme", detectedAt: "2026-01-02T00:00:00Z" },
      ],
    };
  },
};

// A deterministic source that always yields one fresh critical threat.
const critSource: DiscoverySource = {
  id: "test",
  name: "Test source",
  async scan({ subject }) {
    return {
      exposures: [],
      threats: [
        {
          id: `t-${subject.id}`,
          subjectId: subject.id,
          kind: "credential_leak",
          title: "Leak found",
          detail: "test leak",
          riskLevel: "critical",
          source: "dark_web",
          detectedAt: new Date().toISOString(),
          acknowledged: false,
        },
      ],
      log: ["found 1"],
    };
  },
};

// A source that yields one medium-risk data-broker listing — triggers the
// Data-Broker Removal playbook, which runs end-to-end under autopilot.
const brokerSource: DiscoverySource = {
  id: "broker", name: "Broker",
  async scan({ subject }) {
    const ts = new Date().toISOString();
    return {
      exposures: [
        { id: `bx-${subject.id}`, subjectId: subject.id, category: "address", source: "data_broker", sourceName: "Spokeo", snippet: "listing", riskLevel: "medium", riskScore: 20, status: "discovered", discoveredAt: ts, lastSeenAt: ts },
      ],
      threats: [],
      log: ["found broker listing"],
    };
  },
};

// Deterministic DNS client (no network) — fetch always fails → sample assessment.
const domClient = new DohClient((async () => {
  throw new Error("blocked");
}) as unknown as typeof fetch);

describe("runScheduledCycle", () => {
  it("processes every subject and records runs, scores and recommendations", async () => {
    const store = new MemoryStore([
      { userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] },
      { userId: "u2", subject: subject("b", "u2"), exposures: [], threats: [] },
    ]);
    const summary = await runScheduledCycle(store, {
      sources: [critSource],
      provider: new MockProvider(),
      reputationSource: cleanRepSource,
      domainClient: domClient,
    });

    expect(summary.subjectsProcessed).toBe(2);
    expect(summary.newThreats).toBe(2);
    // the dark-web credential-leak threats were tracked by the dark-web sweep
    expect(summary.darkWebSignals).toBeGreaterThan(0);
    expect(store.runs).toHaveLength(2);
    // each new threat gets a recorded investigation (Discovery → Threat Intel → …)
    expect(store.investigations).toHaveLength(2);
    expect(store.investigations[0].steps[0].agent).toBe("discovery");
    expect(store.investigations[0].steps.length).toBeGreaterThanOrEqual(2);
    // one agent state per fleet member, per run
    expect(store.runs[0].agentStates).toHaveLength(AGENT_COUNT);
    // three score snapshots per subject + reputation-health & executive-risk snapshots
    expect(store.scores[0].map((s) => s.kind)).toEqual(["privacy", "identity", "overall"]);
    expect(store.scores.flat().some((s) => s.kind === "reputation")).toBe(true);
    expect(store.scores.flat().some((s) => s.kind === "executive")).toBe(true);
    // critical threat raised a notification
    expect(store.notifications[0][0].riskLevel).toBe("critical");
    // critical threat auto-opened a tracked case per subject, assigned to security
    expect(summary.casesOpened).toBe(2);
    expect(store.createdCases).toHaveLength(2);
    expect(store.createdCases[0]).toMatchObject({ type: "breach_response", assignedAgent: "security", riskLevel: "critical" });
  });

  it("executes recorded playbooks under the autonomy gate and records them for the away-feed", async () => {
    const store = new MemoryStore([
      { userId: "u1", subject: { ...subject("a", "u1"), autonomyMode: "autopilot" }, exposures: [], threats: [] },
    ]);
    const summary = await runScheduledCycle(store, {
      sources: [brokerSource],
      provider: new MockProvider(),
      reputationSource: cleanRepSource,
      domainClient: domClient,
    });
    // Autopilot + a medium-risk listing → the Data-Broker Removal plan runs end-to-end.
    expect(summary.playbooksAutoExecuted).toBe(1);
    expect(summary.playbooksAwaitingApproval).toBe(0);
    // …and it's recorded as a completed agent action, so it surfaces in "While you were away".
    const playbookAction = store.actions.flat().find((a) => a.kind === "report" && /Data-Broker Removal/.test(a.summary));
    expect(playbookAction).toBeTruthy();
    expect(playbookAction!.summary).toMatch(/autonomously/);
    expect(playbookAction!.status).toBe("completed");
  });

  it("pauses high-risk playbook steps for sign-off and notifies the customer", async () => {
    const store = new MemoryStore([
      { userId: "u1", subject: { ...subject("a", "u1"), autonomyMode: "autopilot" }, exposures: [], threats: [] },
    ]);
    const summary = await runScheduledCycle(store, {
      sources: [critSource],
      provider: new MockProvider(),
      reputationSource: cleanRepSource,
      domainClient: domClient,
    });
    // The critical credential leak triggers the breach playbook; its acting steps
    // need sign-off (critical ≥ the autopilot floor and the escalation gate).
    expect(summary.playbooksAwaitingApproval).toBe(1);
    expect(summary.playbooksAutoExecuted).toBe(0);
    const notif = store.notifications.flat().find((n) => /Approval needed: Credential Breach Response/.test(n.title));
    expect(notif).toBeTruthy();
    expect(notif!.riskLevel).toBe("critical");
  });

  it("does not re-open a case when one already exists for the threat", async () => {
    const store = new MemoryStore([
      { userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] },
    ]);
    store.openCaseTitles = ["Leak found"]; // a case for this threat already exists
    const summary = await runScheduledCycle(store, {
      sources: [critSource],
      provider: new MockProvider(),
      reputationSource: cleanRepSource,
      domainClient: domClient,
    });
    expect(summary.casesOpened).toBe(0);
    expect(store.createdCases).toHaveLength(0);
  });

  it("auto-opens a reputation-recovery case from defamatory coverage", async () => {
    const store = new MemoryStore([
      { userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] },
    ]);
    const summary = await runScheduledCycle(store, {
      sources: [],
      provider: new MockProvider(),
      reputationSource: defamatoryRepSource,
      domainClient: domClient,
    });
    expect(summary.reputationCasesOpened).toBe(1);
    const repCase = store.createdCases.find((c) => c.type === "reputation_recovery");
    expect(repCase).toBeTruthy();
    expect(repCase!.assignedAgent).toBe("reputation");
    expect(repCase!.summary).toMatch(/Recovery plan/); // generated plan attached
    // defamatory coverage raised an incident notification
    const notif = store.notifications.flat().find((n) => /Defamatory content detected/.test(n.title));
    expect(notif).toBeTruthy();
    expect(notif!.riskLevel).toBe("high");
  });

  it("escalates the principal to critical executive risk on critical physical threats", async () => {
    const physicalSource: DiscoverySource = {
      id: "phys", name: "Physical",
      async scan({ subject }) {
        const base = { subjectId: subject.id, source: "social_media" as const, detectedAt: new Date().toISOString(), acknowledged: false, riskLevel: "critical" as const };
        const ts = new Date().toISOString();
        return {
          exposures: [
            { id: `ea-${subject.id}`, subjectId: subject.id, category: "address", source: "forum", sourceName: "PasteSite", snippet: "123 Main St", riskLevel: "critical", riskScore: 40, status: "discovered", discoveredAt: ts, lastSeenAt: ts },
            { id: `ep-${subject.id}`, subjectId: subject.id, category: "phone", source: "forum", sourceName: "PasteSite", snippet: "+1 555", riskLevel: "high", riskScore: 30, status: "discovered", discoveredAt: ts, lastSeenAt: ts },
          ],
          threats: [
            { id: `d-${subject.id}`, kind: "doxxing", title: "Home address doxxed", detail: "address posted", ...base },
            { id: `l-${subject.id}`, kind: "location_exposure", title: "Live location leaked", detail: "geotag", ...base },
            { id: `i-${subject.id}`, kind: "impersonation", title: "Fake executive profile", detail: "impersonation", ...base },
          ],
          log: ["physical threats"],
        };
      },
    };
    const store = new MemoryStore([{ userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] }]);
    const summary = await runScheduledCycle(store, { sources: [physicalSource], provider: new MockProvider(), reputationSource: cleanRepSource, domainClient: domClient });

    expect(summary.executiveEscalations).toBe(1);
    const escalation = store.notifications.flat().find((n) => /Executive risk CRITICAL/.test(n.title));
    expect(escalation).toBeTruthy();
    expect(escalation!.riskLevel).toBe("critical");
    // the Executive Agent recorded the escalation
    expect(store.actions.flat().some((a) => a.agent === "executive" && a.kind === "escalate")).toBe(true);
    // the escalating actor (3 recent threats incl. doxxing) opened a protective case
    expect(summary.executiveCasesOpened).toBe(1);
    const protective = store.createdCases.find((c) => c.type === "executive_protection");
    expect(protective).toBeTruthy();
    expect(protective!.assignedAgent).toBe("executive");
    // the doxxing leak (address from the doxxing threat) was routed for takedown
    expect(summary.doxxingTakedownsRouted).toBeGreaterThan(0);
    expect(store.actions.flat().some((a) => a.agent === "executive" && a.kind === "remove" && /takedown/.test(a.summary))).toBe(true);
    // the impersonation threat was tracked by the impersonation sweep
    expect(summary.impersonationSignals).toBeGreaterThan(0);
    expect(store.actions.flat().some((a) => a.kind === "monitor" && /impersonation\/deepfake signal/.test(a.summary))).toBe(true);
    // attack-path analysis surfaced the highest-leverage fix
    expect(summary.attackPathsLive).toBeGreaterThan(0);
    expect(store.actions.flat().some((a) => a.agent === "executive" && /Highest-leverage fix/.test(a.summary))).toBe(true);
  });

  it("auto-files broker opt-outs for discovered broker exposures", async () => {
    const brokerSource: DiscoverySource = {
      id: "broker-test",
      name: "Broker test source",
      async scan({ subject }) {
        return {
          threats: [],
          exposures: [
            {
              id: `e-${subject.id}`, subjectId: subject.id, category: "address",
              source: "data_broker", sourceName: "Spokeo", snippet: "", riskLevel: "high",
              riskScore: 30, status: "discovered", discoveredAt: new Date().toISOString(),
              lastSeenAt: new Date().toISOString(),
            },
          ],
          log: ["found 1 broker listing"],
        };
      },
    };
    const store = new MemoryStore([
      { userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] },
    ]);
    const summary = await runScheduledCycle(store, {
      sources: [brokerSource],
      provider: new MockProvider(),
      reputationSource: repSource,
      domainClient: domClient,
    });

    expect(summary.removalsFiled).toBe(1);
    expect(store.createdRemovals).toHaveLength(1);
    expect(store.createdRemovals[0].brokerName).toBe("Spokeo");
    expect(store.createdRemovals[0].status).toBe("removal_requested");
  });

  it("honors autonomy mode: advisor files nothing autonomously (waits for sign-off)", async () => {
    const brokerSource: DiscoverySource = {
      id: "broker-test",
      name: "Broker test source",
      async scan({ subject: s }) {
        return {
          threats: [],
          exposures: [{
            id: `e-${s.id}`, subjectId: s.id, category: "address", source: "data_broker",
            sourceName: "Spokeo", snippet: "", riskLevel: "high", riskScore: 30, status: "discovered",
            discoveredAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(),
          }],
          log: [],
        };
      },
    };
    const store = new MemoryStore([
      { userId: "u1", subject: { ...subject("a", "u1"), autonomyMode: "advisor" }, exposures: [], threats: [] },
    ]);
    const summary = await runScheduledCycle(store, {
      sources: [brokerSource], provider: new MockProvider(), reputationSource: repSource, domainClient: domClient,
    });
    expect(summary.removalsFiled).toBe(0);
    expect(store.createdRemovals).toHaveLength(0);
  });

  it("collects reputation mentions + sentiment each cycle", async () => {
    const store = new MemoryStore([
      { userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] },
    ]);
    const summary = await runScheduledCycle(store, {
      sources: [],
      provider: new MockProvider(),
      reputationSource: repSource,
      domainClient: domClient,
    });
    expect(summary.mentionsCollected).toBe(2);
    expect(store.reputation[0].mentions).toHaveLength(2);
    expect(store.reputation[0].sentimentByDay.length).toBeGreaterThan(0);
    // sentiment was actually computed (not seeded)
    expect(store.reputation[0].mentions.some((m) => m.sentiment === "positive")).toBe(true);
    expect(store.reputation[0].mentions.some((m) => m.sentiment === "negative")).toBe(true);
    // domain scan also ran (sample assessment for example.com → email-auth risks)
    expect(summary.domainRisksFound).toBeGreaterThan(0);
    expect(store.domainScans[0].domain).toBe("example.com");
  });

  it("advances due data-broker removals autonomously", async () => {
    const removal: RemovalRequest = {
      id: "rem1",
      ...createRemoval("Spokeo", { subjectId: "a", now: new Date(0).toISOString() }),
    };
    const store = new MemoryStore(
      [{ userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] }],
      [removal],
    );
    const summary = await runScheduledCycle(store, { sources: [], provider: new MockProvider(), reputationSource: repSource, domainClient: domClient });
    expect(summary.removalsAdvanced).toBe(1);
    // requested → in_progress on this tick
    expect(store.savedRemovals[0].status).toBe("in_progress");
  });

  it("raises the overall score after a critical discovery", async () => {
    const store = new MemoryStore([
      { userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] },
    ]);
    await runScheduledCycle(store, { sources: [critSource], provider: new MockProvider(), reputationSource: repSource, domainClient: domClient });
    const overall = store.scores[0].find((s) => s.kind === "overall")!;
    expect(overall.value).toBeGreaterThan(0);
  });
});
