/**
 * Demo data source — serves the deterministic dataset when no live, signed-in
 * Supabase session is available. Mutations are no-ops (the server is stateless
 * in demo mode), so the UI stays interactive without persisting.
 */

import type { Subject } from "@/lib/types";
import type { DataSource, PrivacyDataSet } from "./source";
import {
  demoAgents,
  demoCases,
  demoExposures,
  demoRecommendations,
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
}
