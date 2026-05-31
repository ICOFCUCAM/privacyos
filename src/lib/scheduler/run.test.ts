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
  reputation: ReputationData[] = [];
  domainScans: DomainScanData[] = [];

  async listFootprints() {
    return this.footprints;
  }
  async listDueRemovals(now: string): Promise<OwnedRemoval[]> {
    return this.removals
      .filter((r) => isRemovalDue(r, now))
      .map((request) => ({ userId: "u1", request }));
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
      reputationSource: repSource,
      domainClient: domClient,
    });

    expect(summary.subjectsProcessed).toBe(2);
    expect(summary.newThreats).toBe(2);
    expect(store.runs).toHaveLength(2);
    // one agent state per fleet member, per run
    expect(store.runs[0].agentStates).toHaveLength(AGENT_COUNT);
    // three score snapshots per subject
    expect(store.scores[0].map((s) => s.kind)).toEqual(["privacy", "identity", "overall"]);
    // critical threat raised a notification
    expect(store.notifications[0][0].riskLevel).toBe("critical");
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
