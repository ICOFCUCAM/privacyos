import { describe, expect, it } from "vitest";
import { runScheduledCycle } from "./run";
import type {
  Footprint,
  NewAgentAction,
  NewNotification,
  ScoreEntry,
  SchedulerStore,
} from "./store";
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
  constructor(private footprints: Footprint[]) {}
  discovered: { exposures: Exposure[]; threats: Threat[] }[] = [];
  recs: Recommendation[][] = [];
  runs: ProtectOutcome[] = [];
  actions: NewAgentAction[][] = [];
  scores: ScoreEntry[][] = [];
  notifications: NewNotification[][] = [];

  async listFootprints() {
    return this.footprints;
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
}

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

describe("runScheduledCycle", () => {
  it("processes every subject and records runs, scores and recommendations", async () => {
    const store = new MemoryStore([
      { userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] },
      { userId: "u2", subject: subject("b", "u2"), exposures: [], threats: [] },
    ]);
    const summary = await runScheduledCycle(store, {
      sources: [critSource],
      provider: new MockProvider(),
    });

    expect(summary.subjectsProcessed).toBe(2);
    expect(summary.newThreats).toBe(2);
    expect(store.runs).toHaveLength(2);
    // 8 agent states per run
    expect(store.runs[0].agentStates).toHaveLength(8);
    // three score snapshots per subject
    expect(store.scores[0].map((s) => s.kind)).toEqual(["privacy", "identity", "overall"]);
    // critical threat raised a notification
    expect(store.notifications[0][0].riskLevel).toBe("critical");
  });

  it("raises the overall score after a critical discovery", async () => {
    const store = new MemoryStore([
      { userId: "u1", subject: subject("a", "u1"), exposures: [], threats: [] },
    ]);
    await runScheduledCycle(store, { sources: [critSource], provider: new MockProvider() });
    const overall = store.scores[0].find((s) => s.kind === "overall")!;
    expect(overall.value).toBeGreaterThan(0);
  });
});
