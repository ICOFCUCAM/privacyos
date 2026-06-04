import {
  Radar, Fingerprint, FolderKanban, Trash2, FileLock2, Scale, BellRing, CheckCircle2,
  Cpu, Boxes, Unplug,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-fg">
    {children}
  </span>
);

/* ════════════════════════════════════════════════════════════════════════════
   Section 1 — The Operating System
   A cinematic SVG: five risk domains feed one Intelligence Engine, with light
   trails flowing along the connectors toward a breathing core. Pure SVG so it
   scales cleanly and the motion is deterministic; reduced-motion safe via CSS.
   ════════════════════════════════════════════════════════════════════════════ */

const DOMAINS: { name: string; sub: string; y: number }[] = [
  { name: "PERSONAL", sub: "Identity · Privacy · Financial", y: 78 },
  { name: "FAMILY", sub: "Children · Household · Relatives", y: 171 },
  { name: "EXECUTIVE", sub: "Doxxing · Impersonation · Threats", y: 264 },
  { name: "REPUTATION", sub: "Search · Social · Media", y: 357 },
  { name: "BUSINESS", sub: "Employees · Domains · Vendors", y: 450 },
];
const ENGINE = { x: 732, y: 264 };

export function ArchitectureEngine() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-[#070810] py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_78%_50%,rgba(99,102,241,0.16),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>The operating system</Eyebrow>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Every layer feeds one engine.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Personal, family, executive, reputation and business risk are not five products — they
            stream into a single intelligence engine that correlates, decides and acts.
          </p>
        </div>

        <div className="mt-14">
          <svg viewBox="0 0 940 528" className="mx-auto h-auto w-full max-w-5xl" role="img" aria-label="Five risk domains feeding the PrivacyOS Intelligence Engine">
            <defs>
              <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a5b4fc" />
                <stop offset="55%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#3730a3" />
              </radialGradient>
              <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            {/* faint outer glow behind the core */}
            <circle cx={ENGINE.x} cy={ENGINE.y} r="150" fill="#6366f1" opacity="0.12" filter="url(#soft)" />

            {/* connectors: a static faint line + an animated light trail per domain */}
            {DOMAINS.map((d, i) => {
              const path = `M278 ${d.y} C 440 ${d.y}, 500 ${ENGINE.y}, 636 ${ENGINE.y}`;
              return (
                <g key={d.name}>
                  <path d={path} fill="none" stroke="#6366f1" strokeOpacity="0.18" strokeWidth="1.5" />
                  <path d={path} fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round"
                    className="trail-flow" style={{ animationDelay: `${i * 0.5}s` }} />
                </g>
              );
            })}

            {/* domain nodes */}
            {DOMAINS.map((d) => (
              <g key={d.name}>
                <rect x="26" y={d.y - 33} width="252" height="66" rx="14" fill="#0e1018" stroke="#22252e" strokeWidth="1" />
                <rect x="26" y={d.y - 33} width="252" height="66" rx="14" fill="none" stroke="#6366f1" strokeOpacity="0.35" strokeWidth="1" />
                <circle cx="52" cy={d.y} r="5" fill="#818cf8" />
                <text x="72" y={d.y - 4} fill="#e2e8f0" fontSize="15" fontWeight="700" letterSpacing="0.06em">{d.name}</text>
                <text x="72" y={d.y + 15} fill="#64748b" fontSize="10.5">{d.sub}</text>
              </g>
            ))}

            {/* the engine core */}
            <circle cx={ENGINE.x} cy={ENGINE.y} r="104" fill="none" stroke="#6366f1" strokeOpacity="0.3" strokeWidth="1.5" className="core-pulse" />
            <circle cx={ENGINE.x} cy={ENGINE.y} r="84" fill="none" stroke="#818cf8" strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx={ENGINE.x} cy={ENGINE.y} r="66" fill="url(#coreGrad)" filter="url(#soft)" opacity="0.9" />
            <circle cx={ENGINE.x} cy={ENGINE.y} r="62" fill="#0b0d17" stroke="#6366f1" strokeOpacity="0.6" strokeWidth="1.5" />
            <text x={ENGINE.x} y={ENGINE.y - 2} textAnchor="middle" fill="#ffffff" fontSize="17" fontWeight="800">PrivacyOS</text>
            <text x={ENGINE.x} y={ENGINE.y + 18} textAnchor="middle" fill="#818cf8" fontSize="8.5" fontWeight="700" letterSpacing="0.18em">INTELLIGENCE ENGINE</text>
          </svg>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Section 2 — Watch the platform work
   A live cascade: a beam descends the spine, lighting each step in turn and
   flipping it to "done" — the real-time response a visitor watches play out.
   ════════════════════════════════════════════════════════════════════════════ */

const SIM_STEPS: { label: string; detail: string; icon: LucideIcon }[] = [
  { label: "Data-broker exposure", detail: "Discovery finds your record for sale", icon: Radar },
  { label: "Identity risk scored", detail: "Correlated and prioritized by the engine", icon: Fingerprint },
  { label: "Case created", detail: "Tracked, with the responding agent assigned", icon: FolderKanban },
  { label: "Removal filed", detail: "Opt-out submitted · 30/60/90-day re-checks", icon: Trash2 },
  { label: "Evidence sealed", detail: "SHA-256 digest + chain of custody", icon: FileLock2 },
  { label: "Legal action drafted", detail: "The matching erasure/takedown instrument", icon: Scale },
  { label: "Monitoring active", detail: "Watching — and acting again if it returns", icon: BellRing },
];
const SIM_CYCLE = 5.6;

export function ThreatSimulation() {
  return (
    <section className="relative overflow-hidden py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Watch the platform work</Eyebrow>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            One finding. The whole response.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            The moment something surfaces, the engine runs the entire chain — automatically, with a
            tamper-evident record at every step. Other tools stop at the first line.
          </p>
        </div>

        <ol className="relative mx-auto mt-14 max-w-xl">
          {/* the spine + the descending beam */}
          <span aria-hidden className="absolute left-[27px] top-3 bottom-3 w-px bg-border" />
          <span aria-hidden className="sim-beam absolute left-[27px] top-3 bottom-3 w-px bg-gradient-to-b from-brand-fg via-brand to-transparent shadow-[0_0_12px_2px_rgba(129,140,248,0.6)]" />
          {SIM_STEPS.map((s, i) => {
            const delay = `${(i / SIM_STEPS.length) * SIM_CYCLE}s`;
            return (
              <li key={s.label} className="relative flex items-start gap-5 pb-7 last:pb-0">
                <span className="sim-node relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/20 to-brand/5 shadow-lg shadow-brand/10" style={{ animationDelay: delay }}>
                  <s.icon className="h-6 w-6 text-brand-fg" />
                  <CheckCircle2 className="sim-check absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-[#070810] text-risk-low" style={{ animationDelay: delay }} />
                </span>
                <div className="pt-2">
                  <p className="text-base font-semibold text-white">{s.label}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{s.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Section 3 — Mission Control
   A living command center: six operational counters with shimmering accents and
   an endlessly-scrolling operations stream — the platform visibly at work, not a
   screenshot. CSS-only motion (deterministic), reduced-motion safe.
   ════════════════════════════════════════════════════════════════════════════ */

const MC_METRICS: { label: string; value: string; sub: string; icon: LucideIcon }[] = [
  { label: "Cases opened", value: "Continuous", sub: "auto-raised from live detections", icon: FolderKanban },
  { label: "Removals filed", value: "Always-on", sub: "broker opt-outs + 30/60/90 re-checks", icon: Trash2 },
  { label: "Threats neutralized", value: "24/7", sub: "across every monitored layer", icon: Radar },
  { label: "Executives protected", value: "Principal-grade", sub: "doxxing · impersonation · threat actors", icon: Fingerprint },
  { label: "Families protected", value: "Whole-household", sub: "relatives, minors & shared exposure", icon: BellRing },
  { label: "Domains monitored", value: "Org-wide", sub: "lookalikes, email security & vendors", icon: Scale },
];

const MC_STREAM: { dot: string; text: string; src: string }[] = [
  { dot: "bg-risk-high", text: "Credential leak detected on the dark web", src: "Security Agent" },
  { dot: "bg-risk-low", text: "Broker opt-out filed at Spokeo", src: "Privacy Agent" },
  { dot: "bg-brand", text: "Case opened: executive-protection escalation", src: "Executive Agent" },
  { dot: "bg-risk-low", text: "Evidence sealed (SHA-256) into the vault", src: "System" },
  { dot: "bg-risk-medium", text: "Defamatory coverage flagged — recovery case raised", src: "Reputation Agent" },
  { dot: "bg-brand", text: "GDPR erasure request drafted for review", src: "Legal Agent" },
  { dot: "bg-risk-high", text: "Lookalike domain found — takedown routed", src: "Executive Agent" },
  { dot: "bg-risk-low", text: "Removal confirmed — listing taken down", src: "Privacy Agent" },
  { dot: "bg-risk-medium", text: "SLA breach auto-escalated for sign-off", src: "Compliance" },
  { dot: "bg-brand", text: "Family risk: minor exposure → protective case", src: "Executive Agent" },
];

function StreamRows() {
  return (
    <>
      {MC_STREAM.map((r, i) => (
        <li key={i} className="flex items-center gap-2.5 px-4 py-2.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.dot}`} />
          <span className="min-w-0 flex-1 truncate text-[12px] text-slate-300">{r.text}</span>
          <span className="shrink-0 text-[10px] text-slate-600">{r.src}</span>
        </li>
      ))}
    </>
  );
}

export function MissionControlShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-[#070810] py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_-10%,rgba(99,102,241,0.14),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Mission control</Eyebrow>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            A living command center.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Not a screenshot — the engine at work. Continuous discovery, removal, escalation and
            response across every layer, with a tamper-evident record of each action.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-border bg-bg-elevated/30 shadow-2xl shadow-brand/10">
          {/* status bar */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-5 py-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-risk-low">
              <span className="live-ping h-2 w-2 rounded-full bg-risk-low" /> Live
            </span>
            <span className="text-xs text-slate-400">Autonomous operations · all tenants</span>
            <span className="ml-auto text-[11px] text-slate-600">24/7 · pg-cron / edge</span>
          </div>

          <div className="grid gap-px bg-border lg:grid-cols-3">
            {/* metric tiles */}
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:col-span-2">
              {MC_METRICS.map((m) => (
                <div key={m.label} className="bg-[#0b0d15] p-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <m.icon className="h-4 w-4 text-brand-fg" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">{m.label}</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-white">{m.value}</p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-bg-subtle">
                    <div className="accent-shimmer h-full w-full rounded-full" />
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-slate-500">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* live operations stream */}
            <div className="bg-[#0b0d15]">
              <p className="border-b border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Operations stream</p>
              <div className="relative h-[280px] overflow-hidden">
                <ul className="ops-stream divide-y divide-border/50">
                  <StreamRows />
                  <StreamRows />
                </ul>
                <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b0d15] to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   One Engine. Not Ten Tools. — the "why nobody else can do this" section.
   Left: the fragmented stack — isolated, dashed, STATIC silos (dead). Right: one
   PrivacyOS engine where the same categories are unified and ALIVE (motion). The
   motion contrast (static vs flowing) is the argument. Brand-neutral categories.
   ════════════════════════════════════════════════════════════════════════════ */

const ENGINE_CATEGORIES = [
  "Data-broker removal", "Identity protection", "Credit monitoring",
  "Dark-web monitoring", "Reputation defense", "Executive protection",
];

export function OneEngineNotTenTools() {
  return (
    <section className="relative overflow-hidden py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_82%_45%,rgba(99,102,241,0.14),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Why nobody else can do this</Eyebrow>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            One engine. Not ten tools.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Competitors each own one slice and never talk to each other — so your risk falls through
            the gaps between them. PrivacyOS runs every layer through a single engine, so a finding
            anywhere becomes action everywhere.
          </p>
        </div>

        <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-2">
          {/* LEFT — the fragmented stack (isolated, dashed, static = dead) */}
          <div className="rounded-3xl border border-border bg-bg-elevated/20 p-6">
            <div className="flex items-center gap-2 text-slate-500">
              <Unplug className="h-4 w-4" />
              <p className="text-[11px] font-bold uppercase tracking-wider">The stack you have today</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {ENGINE_CATEGORIES.map((c) => (
                <div key={c} className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-700/70 bg-bg-subtle/20 px-3 py-3">
                  <Boxes className="h-4 w-4 shrink-0 text-slate-600" />
                  <span className="text-[13px] font-medium text-slate-400">{c}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-slate-600">Six vendors · six logins · six bills · nothing shared. Your risk lives in the gaps.</p>
          </div>

          {/* RIGHT — one engine (unified, glowing, alive) */}
          <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-b from-brand/10 to-transparent p-6 shadow-2xl shadow-brand/10">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
            <div className="relative flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/20 ring-1 ring-brand/40">
                <Cpu className="h-5 w-5 text-brand-fg core-pulse" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">PrivacyOS · one engine</p>
                <p className="text-[11px] text-brand-fg">every layer correlated &amp; acting</p>
              </div>
            </div>
            <div className="relative mt-5 grid grid-cols-2 gap-3">
              {ENGINE_CATEGORIES.map((c) => (
                <div key={c} className="relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-brand/20 bg-bg-subtle/40 px-3 py-3">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 accent-shimmer" />
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-risk-low" />
                  <span className="text-[13px] font-semibold text-white">{c}</span>
                </div>
              ))}
            </div>
            <div className="relative mt-5 rounded-xl border border-brand/25 bg-bg-subtle/40 px-4 py-3 text-xs leading-relaxed text-slate-200">
              + the part no point tool can replicate: one finding → case → removal → sealed evidence → legal → monitoring, automatically.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
