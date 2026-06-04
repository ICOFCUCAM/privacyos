import { ShieldCheck, Bot, Scale, Radar } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/brand-mark";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const highlights: { icon: typeof ShieldCheck; title: string; desc: string }[] = [
  { icon: Radar, title: "Continuous discovery", desc: "Every exposure across brokers, breaches and the dark web." },
  { icon: Bot, title: "A coordinated agent fleet", desc: "13 specialists detect, remediate and escalate 24/7." },
  { icon: Scale, title: "Compliance & legal automation", desc: "GDPR/CCPA requests and SOC 2 posture, generated for you." },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* ── Brand panel (premium, gradient, logo lockup) ───────────────────── */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-bg-elevated/40 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* ambient glows */}
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-brand-fg/10 blur-3xl" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative">
          <BrandMark size={48} wordmarkClass="text-3xl" className="gap-3" />
          <p className="mt-3 text-sm tracking-[0.2em] text-slate-500">PROTECT WHAT MATTERS</p>
        </div>

        <div className="relative space-y-6">
          <h2 className="max-w-sm text-2xl font-bold leading-snug tracking-tight text-white">
            The Digital Risk Operating System.
          </h2>
          <ul className="space-y-4">
            {highlights.map((h) => (
              <li key={h.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 ring-1 ring-brand/25">
                  <h.icon className="h-4 w-4 text-brand-fg" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{h.title}</p>
                  <p className="text-sm text-slate-400">{h.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          GDPR &amp; CCPA ready · RBAC · End-to-end encryption · SOC 2 posture
        </p>
      </aside>

      {/* ── Auth panel ─────────────────────────────────────────────────────── */}
      <div className="bg-grid flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* compact logo for mobile (brand panel hidden) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandMark size={32} wordmarkClass="text-xl" />
          </div>
          <div className="rounded-2xl border border-border bg-bg-elevated/60 p-7 shadow-2xl shadow-black/30 backdrop-blur">
            <h1 className="mb-1 text-xl font-semibold text-white">Welcome back</h1>
            <p className="mb-6 text-sm text-slate-400">
              Sign in to your protection dashboard.
            </p>
            <LoginForm next={next ?? "/dashboard/home"} configured={configured} oauthError={error} />
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            Protected by MyPrivacyOS · your data stays yours.
          </p>
        </div>
      </div>
    </main>
  );
}
