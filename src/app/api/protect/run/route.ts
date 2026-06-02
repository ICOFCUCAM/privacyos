import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDataSource } from "@/lib/data";
import { getEntitlements } from "@/lib/billing/subscription";
import { canRescan } from "@/lib/billing/entitlements";
import { coerceMode, AUTONOMY_COOKIE } from "@/lib/home/autonomy";
import { planAutoRemediation } from "@/lib/home/auto-remediation";
import { recordAudit } from "@/lib/audit/audit";

/**
 * POST /api/protect/run — run one autonomous remediation pass for the current
 * user, under their autonomy mode. Opens cases for below-floor recommendations
 * and files broker opt-outs for below-floor removable exposures (within the
 * plan's allowance), logging every action. Continuous protection is paid; the
 * free tier and demo mode are no-ops. Idempotent: re-runs skip handled items.
 */
export async function POST() {
  const ds = await getDataSource();
  if (!ds.live) return NextResponse.json({ ran: false, reason: "demo" });

  const ent = await getEntitlements();
  if (!canRescan(ent)) return NextResponse.json({ ran: false, reason: "upgrade_required" });

  const mode = coerceMode((await cookies()).get(AUTONOMY_COOKIE)?.value);
  const data = await ds.getDataset();
  let removals: Awaited<ReturnType<typeof ds.listRemovals>> = [];
  try { removals = await ds.listRemovals(); } catch { removals = []; }

  const plan = planAutoRemediation({
    recommendations: data.recommendations,
    exposures: data.exposures,
    removals,
    mode,
    brokerRemovalLimit: ent.brokerRemovalLimit,
    enabled: true,
  });

  let casesOpened = 0;
  let removalsFiled = 0;
  for (const action of plan.actions) {
    try {
      if (action.kind === "open_case") {
        await ds.approveRecommendation(action.recId);
        await recordAudit({ action: "auto.case_opened", entity: "recommendation", entityId: action.recId, metadata: { mode, title: action.title } });
        casesOpened += 1;
      } else {
        await ds.createRemoval(action.brokerName, action.exposureId);
        await recordAudit({ action: "auto.removal_filed", entity: "exposure", entityId: action.exposureId, metadata: { mode, broker: action.brokerName } });
        removalsFiled += 1;
      }
    } catch {
      /* best-effort — never let one failed action abort the sweep */
    }
  }

  return NextResponse.json({ ran: true, mode, casesOpened, removalsFiled });
}
