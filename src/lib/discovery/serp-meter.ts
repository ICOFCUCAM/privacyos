/**
 * SerpApi budget meter — the INTERNAL cost/abuse backstop.
 *
 * Reserves live SerpApi searches against a per-account, per-period ceiling via
 * the atomic `consume_serp_budget` SQL function. The ceiling is generous and
 * invisible to users: normal usage never reaches it, and when it does the
 * connectors silently fall back to cache + keyless layers — never a user-facing
 * "limit reached". A trip is logged for ops (and best-effort audited), so YOU
 * can spot the anomaly. Meter failure never blocks protection (fails open).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCacheSession } from "@/lib/data/cache-session";
import { recordAudit } from "@/lib/audit/audit";
import type { SerpMeter } from "./source";

/** Monthly period key (UTC, first of month) — the budget window. */
export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export class SupabaseSerpMeter implements SerpMeter {
  private tripped = false;

  constructor(
    private db: SupabaseClient,
    private userId: string,
    private budget: number,
    private period = currentPeriod(),
    private onTrip?: (info: { userId: string; budget: number }) => void | Promise<void>,
  ) {}

  async consume(cost: number): Promise<boolean> {
    if (!Number.isFinite(this.budget)) return true; // uncapped (demo/admin)
    if (this.budget <= 0) { await this.trip(); return false; } // never spends
    try {
      const { data, error } = await this.db.rpc("consume_serp_budget", {
        p_user_id: this.userId,
        p_period: this.period,
        p_amount: cost,
        p_budget: this.budget,
      });
      if (error) return true; // fail open — a meter error must not block protection
      const allowed = data === true;
      if (!allowed) await this.trip();
      return allowed;
    } catch {
      return true; // fail open
    }
  }

  /** Internal-only alert, fired once. Never surfaced to the user. */
  private async trip(): Promise<void> {
    if (this.tripped) return;
    this.tripped = true;
    console.error(
      `[privacyos] SERP budget ceiling reached for user ${this.userId} ` +
        `(budget ${this.budget}, period ${this.period}) — pausing paid scans, ` +
        `serving cache + keyless layers.`,
    );
    try { await this.onTrip?.({ userId: this.userId, budget: this.budget }); } catch { /* ignore */ }
  }
}

/**
 * Build a meter for the current interactive (authenticated) session. Returns
 * undefined — meaning uncapped — when there's no session or the budget is
 * infinite (demo/admin), so callers can pass it straight through.
 */
export async function interactiveSerpMeter(budget: number): Promise<SerpMeter | undefined> {
  if (!Number.isFinite(budget)) return undefined;
  const session = await getCacheSession();
  if (!session) return undefined;
  return new SupabaseSerpMeter(
    session.db,
    session.userId,
    budget,
    currentPeriod(),
    ({ userId, budget }) =>
      recordAudit({ action: "serp.budget.exceeded", entity: "user", entityId: userId, metadata: { budget } }),
  );
}
