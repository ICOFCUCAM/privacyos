import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { UpgradeGate } from "@/components/upgrade-gate";
import { getDataSource } from "@/lib/data";
import { getEntitlements } from "@/lib/billing/subscription";
import { GATED_SUITES, requiredFeature } from "@/lib/billing/gating";
import { CATEGORY_META } from "@/lib/billing/plans";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ds = await getDataSource();
  const subject = await ds.getPrimarySubject();
  // Live, signed-in user without a subject yet → send them through onboarding.
  if (ds.live && !subject) redirect("/onboarding");
  const name = subject?.displayName ?? "your footprint";

  // Plan gating: lock suite pages the current plan doesn't include.
  const entitlements = await getEntitlements();
  const pathname = (await headers()).get("x-pathname") ?? "";
  const needed = requiredFeature(pathname);
  const locked = needed !== null && !entitlements.features[needed];
  const gatedSuite = needed ? GATED_SUITES.find((s) => s.feature === needed) : undefined;
  const lockedFeatures = GATED_SUITES.filter((s) => !entitlements.features[s.feature]).map((s) => s.feature);

  return (
    <div className="flex min-h-screen">
      <Sidebar subjectName={subject?.displayName} live={ds.live} lockedFeatures={lockedFeatures} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav subjectName={subject?.displayName} live={ds.live} lockedFeatures={lockedFeatures} />
        <header className="hidden items-center justify-between border-b border-border px-6 py-3 lg:flex">
          <p className="text-sm text-slate-400">
            Protecting <span className="font-medium text-white">{name}</span>
          </p>
          <span
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-slate-300"
            title={ds.live ? "Connected to Supabase" : "Running on the built-in demo dataset"}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${ds.live ? "bg-risk-low" : "bg-risk-medium"}`}
            />
            {ds.live ? "Live data" : "Demo data"}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {locked && gatedSuite ? (
            <UpgradeGate
              suite={gatedSuite.label}
              description={CATEGORY_META[gatedSuite.upsell as keyof typeof CATEGORY_META]?.blurb ?? "Upgrade your plan to unlock this suite."}
              upsell={gatedSuite.upsell}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
