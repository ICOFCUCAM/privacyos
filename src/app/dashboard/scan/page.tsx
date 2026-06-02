import { getDataSource } from "@/lib/data";
import { getEntitlements } from "@/lib/billing/subscription";
import { defaultModeForPlan } from "@/lib/home/autonomy";
import { ScaryMirror } from "./mirror";

export const metadata = { title: "Exposure Scan" };

export default async function ScanPage() {
  const ds = await getDataSource();
  const [data, entitlements] = await Promise.all([ds.getDataset(), getEntitlements()]);
  const defaultName = data.subject.displayName ?? "";
  const defaultMode = defaultModeForPlan(entitlements.planId ?? undefined);

  return (
    <div className="py-4">
      <ScaryMirror defaultName={defaultName} defaultMode={defaultMode} live={ds.live} />
    </div>
  );
}
