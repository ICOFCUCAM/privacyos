import Link from "next/link";
import { Bell } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { UpgradeGate } from "@/components/upgrade-gate";
import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { getEntitlements } from "@/lib/billing/subscription";
import { isOperator } from "@/lib/billing/entitlements";
import { GATED_SUITES, requiredFeature, isOperatorRoute } from "@/lib/billing/gating";
import { CATEGORY_META } from "@/lib/billing/plans";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/lib/i18n/server";

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
  // Internal operator consoles (company financials) are never for customers.
  if (isOperatorRoute(pathname) && !isOperator(entitlements)) redirect("/dashboard/home");
  const operator = isOperator(entitlements);
  const needed = requiredFeature(pathname);
  const locked = needed !== null && !entitlements.features[needed];
  const gatedSuite = needed ? GATED_SUITES.find((s) => s.feature === needed) : undefined;
  const lockedFeatures = GATED_SUITES.filter((s) => !entitlements.features[s.feature]).map((s) => s.feature);

  const { notifications } = await getModuleData();
  const unread = notifications.filter((n) => !n.read).length;
  const t = await getT();

  return (
    <div className="flex min-h-screen">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <Sidebar subjectName={subject?.displayName} live={ds.live} lockedFeatures={lockedFeatures} isOperator={operator} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav subjectName={subject?.displayName} live={ds.live} lockedFeatures={lockedFeatures} isOperator={operator} />
        <header className="hidden items-center justify-between border-b border-border px-6 py-3 lg:flex">
          <p className="text-sm text-slate-400">
            {(() => {
              const [before, after] = t("common.protecting", { name: "\u0000" }).split("\u0000");
              return (<>{before}<span className="font-medium text-white">{name}</span>{after ?? ""}</>);
            })()}
          </p>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link
              href="/dashboard/notifications"
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
              className="relative rounded-lg p-2 text-slate-400 transition hover:bg-bg-elevated hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-critical px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <span
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-slate-300"
              title={ds.live ? "Connected to Supabase" : "Running on the built-in demo dataset"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${ds.live ? "bg-risk-low" : "bg-risk-medium"}`} />
              {ds.live ? t("common.liveData") : t("common.demoData")}
            </span>
          </div>
        </header>
        <main id="content" className="flex-1 overflow-y-auto p-6">
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
