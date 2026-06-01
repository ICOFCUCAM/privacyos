# PrivacyOS

**The antivirus for your personal information.** An AI-powered Privacy,
Reputation, Identity Protection, and Digital Risk Management platform that
discovers, monitors, analyzes, and continuously defends a user's digital
presence across search engines, data brokers, social media, the dark web,
breach databases, and AI-generated content — driven by autonomous AI agents.

PrivacyOS is not a data-broker-removal tool. It is a complete digital
protection operating system for individuals, executives, public figures,
families, and organizations.

---

## What's in this repository

This is a working, runnable **foundation** for the platform — not the finished
$100M product, but a coherent architecture you can build the rest on top of.

| Area | Status |
| --- | --- |
| Next.js 15 + TypeScript + Tailwind app | ✅ runnable |
| Multi-section dashboard (overview, protection suite, mission control, identity, exposures, threats, reputation, cases, executive, family, travel, business, reports) | ✅ |
| Proprietary 5-axis risk scoring engine | ✅ unit-tested |
| AI agent orchestration layer (8 specialized agents) | ✅ unit-tested |
| Pluggable LLM provider (Claude / OpenAI / deterministic mock) | ✅ |
| `POST /api/protect` flagship "Protect me" endpoint (persists runs when live) | ✅ |
| Discovery pipeline + breach-check connector (HIBP / offline sim) | ✅ unit-tested |
| Supabase schema (multi-tenant, RLS) + migrations + seed | ✅ |
| Supabase auth (email + password), session middleware, route guard | ✅ |
| Data-access layer with live ⇄ demo auto-switch | ✅ unit-tested |
| Demo dataset so everything runs with **zero config** | ✅ |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the design,
[`ROADMAP.md`](./ROADMAP.md) for what comes next, and
[`CAPABILITY_MATRIX.md`](./CAPABILITY_MATRIX.md) for the full feature audit.

### Product suites

PrivacyOS is organized into protection modules, all navigable in the dashboard
and unified by the **Protection Suite** cross-domain scorecard
(`/dashboard/suite`) and **Mission Control** (`/dashboard/mission-control`):

- **PrivacyOS** — exposure inventory, threat feed, cases, AI recommendations
- **Digital Identity OS** — per-account ATO risk, password hygiene, dark-web
  identity monitoring, restoration playbook ([docs](docs/digital-identity-os.md))
- **ReputationOS** — mentions, sentiment, defamation, SEO recovery, journalists
- **Executive Protection OS** — Executive Risk Score (5 indices), **Attack Path
  Analysis** (kill-chain + chokepoint), Residence, Doxxing, Impersonation,
  Dark-Web, Threat-Actor tracking, Command ([docs](docs/executive-protection-os.md))
- **Family Protection OS** — registry, exposure tracking, child safety, family
  graph with risk propagation ([docs](docs/family-protection-os.md))
- **Travel Security OS** — trip registry, destination intelligence, pre-travel
  readiness ([docs](docs/travel-security-os.md))
- **Business / Brand Protection OS** — Brand Risk Score, brand impersonation,
  domains, workforce, third-party risk ([docs](docs/business-brand-os.md))
- **Automation** — AI agents, autonomous protection cycle, legal document
  generator, reporting engine, alerts

Six scoring axes (`src/lib/scoring/scores.ts`), six discovery layers
(`src/lib/discovery/`), a legal engine (`src/lib/legal/`) exporting six document
types via `GET /api/legal`, and a reporting engine (`src/lib/reports/`) producing
**ten** print-ready reports via `GET /api/reports/[type]` (privacy, executive,
family, travel, identity, business, threat, compliance, risk, board).

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — runs on demo data without it
npm run dev                  # http://localhost:3000
```

The app runs fully on a deterministic **demo dataset** with no Supabase or AI
keys. Add keys to `.env.local` to switch to live data and real LLM-backed
agents.

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest — scoring + orchestrator tests
npm run build       # production build
```

## The "Protect me" flow

The flagship experience: the user expresses intent and a fleet of agents runs
concurrently over their footprint, returning prioritized recommendations.

```bash
curl -X POST http://localhost:3000/api/protect
# → { riskBefore, projectedRisk, recommendations[], agentStates[], log[] }
```

## Discovery (finding real exposures)

The discovery pipeline scans external surfaces and feeds new exposures/threats
into the footprint. The first connector checks emails against breach databases
(HaveIBeenPwned when `HIBP_API_KEY` is set, otherwise a deterministic offline
simulator). Trigger it from the **Exposure Inventory** page ("Run discovery
scan") or via the API:

```bash
curl -X POST http://localhost:3000/api/discover
# → { newExposures, newThreats, exposures[], threats[], log[], persisted }
```

New connectors implement the `DiscoverySource` interface
(`src/lib/discovery/source.ts`); the pipeline runs them concurrently, isolates
failures, and dedupes findings against the known footprint.

## Data-broker removal automation

The **Broker Removals** dashboard files opt-outs against a broker registry
(`src/lib/brokers/`) and tracks each through a removal state machine
(`removal_requested → in_progress → removed → monitoring`) with recurring
reappearance re-checks at a 30/60/90-day cadence; reappeared listings are
auto-re-filed. The scheduled cycle advances every due removal autonomously, so
the 24/7 monitor keeps removals progressing without user action.

## Always-on monitoring (scheduled runs)

`POST/GET /api/cron` runs the full protection cycle across **all tenants** using
the service-role client: discovery → agent orchestration → scoring → persistence
(new exposures/threats, refreshed recommendations, `agent_runs`, `agent_actions`,
`score_snapshots`, and critical-threat notifications). It reuses the exact same
orchestrator/discovery/scoring as interactive runs, so they never drift
(`src/lib/scheduler/`).

Guard it with `CRON_SECRET` (callers send `Authorization: Bearer <secret>`).
Trigger it any of three ways:

- **Supabase**: deploy the `scheduled-protect` Edge Function and schedule it with
  `supabase/migrations/0003_cron.sql` (pg_cron + pg_net, daily).
- **Vercel Cron**: `vercel.json` is preconfigured (Vercel sets the bearer when
  `CRON_SECRET` is set).
- **Anything else**: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron`.

## Tech stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + RLS), Edge Functions
- **AI layer:** Claude / OpenAI behind a provider abstraction, custom agent
  orchestrator
- **Architecture:** cloud-native, multi-tenant, enterprise-grade security

## Connecting Supabase (go live)

1. Create a project and copy the URL + anon key (and the service-role key, for
   the scheduler) into `.env.local`.
2. Apply the migrations in order: `0001_init.sql`, `0002_suites.sql`,
   `0003_cron.sql` (Supabase CLI or SQL editor).
3. Run the app, visit `/login`, and **sign up** (email/password) — or use
   **SSO**. To enable Google/Microsoft: turn the providers on in Supabase
   (Authentication → Providers), set the provider client IDs/secrets, set
   `NEXT_PUBLIC_SITE_URL`, and add `<site>/auth/callback` as an allowed redirect.
4. You're routed through **in-app onboarding** to create your first protected
   subject and run an initial scan — no SQL required. (Prefer a fully populated
   demo? Run `supabase/seed.sql` instead.)
5. The app auto-detects the session and switches from demo to live, RLS-scoped
   data. Sign-in is required for `/dashboard`; signed-out users still get the
   demo experience.

### How live ⇄ demo switching works

`getDataSource()` (`src/lib/data/index.ts`) returns the live `SupabaseDataSource`
only when Supabase is configured **and** a user is signed in; otherwise the
`DemoDataSource`. Every dashboard page and the `/api/protect` route depend on
this interface, never on Supabase or the demo arrays directly.
