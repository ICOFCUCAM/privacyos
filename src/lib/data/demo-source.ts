/**
 * Demo data source — serves the deterministic dataset when no live, signed-in
 * Supabase session is available. Mutations are no-ops (the server is stateless
 * in demo mode), so the UI stays interactive without persisting.
 */

import type { RemovalRequest, Subject } from "@/lib/types";
import type { DataSource, PrivacyDataSet } from "./source";
import type { EvidenceItem } from "@/lib/intelligence/evidence-vault";
import {
  demoAgents,
  demoCases,
  demoExposures,
  demoRecommendations,
  demoRemovals,
  demoRiskScore,
  demoSubject,
  demoThreats,
} from "./demo";

export class DemoDataSource implements DataSource {
  readonly live = false;

  async getPrimarySubject(): Promise<Subject | null> {
    return demoSubject;
  }

  async getDataset(): Promise<PrivacyDataSet> {
    return {
      subject: demoSubject,
      exposures: demoExposures,
      threats: demoThreats,
      cases: demoCases,
      recommendations: demoRecommendations,
      agents: demoAgents,
      riskScore: demoRiskScore,
    };
  }

  async acknowledgeThreat(): Promise<void> {
    // no-op in demo mode
  }

  async approveRecommendation(): Promise<void> {
    // no-op in demo mode
  }

  async persistProtectRun(): Promise<void> {
    // no-op in demo mode — results are returned to the caller, not stored
  }

  async persistDiscovery(): Promise<void> {
    // no-op in demo mode — findings are returned to the caller, not stored
  }

  async listRemovals(): Promise<RemovalRequest[]> {
    return demoRemovals;
  }

  async createRemoval(): Promise<void> {
    // no-op in demo mode
  }

  async recheckRemoval(): Promise<void> {
    // no-op in demo mode
  }

  async setAutonomyMode(): Promise<void> {
    // no-op in demo mode (the cookie still drives the demo UI)
  }

  async listEvidence(): Promise<EvidenceItem[]> {
    // No persisted ledger in demo mode — the page derives evidence from the dataset.
    return [];
  }
}
