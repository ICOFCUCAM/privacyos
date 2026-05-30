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
| Multi-section dashboard (overview, exposures, threats, reputation, cases, recommendations, agents, executive, family, business, reports) | ✅ |
| Proprietary 5-axis risk scoring engine | ✅ unit-tested |
| AI agent orchestration layer (8 specialized agents) | ✅ unit-tested |
| Pluggable LLM provider (Claude / OpenAI / deterministic mock) | ✅ |
| `POST /api/protect` flagship "Protect me" endpoint (persists runs when live) | ✅ |
| Discovery pipeline + breach-check connector (HIBP / offline sim) | ✅ unit-tested |
| Supabase schema (multi-tenant, RLS) + migrations + seed | ✅ |
| Supabase auth (email + password), session middleware, route guard | ✅ |
| Data-access layer with live ⇄ demo auto-switch | ✅ unit-tested |
| Demo dataset so everything runs with **zero config** | ✅ |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the design and
[`ROADMAP.md`](./ROADMAP.md) for what comes next.

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

## Tech stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + RLS), Edge Functions
- **AI layer:** Claude / OpenAI behind a provider abstraction, custom agent
  orchestrator
- **Architecture:** cloud-native, multi-tenant, enterprise-grade security

## Connecting Supabase (go live)

1. Create a project and copy the URL + anon key into `.env.local`.
2. Apply `supabase/migrations/0001_init.sql` (Supabase CLI or SQL editor).
3. Run the app, visit `/login`, and **sign up** an account.
4. Run `supabase/seed.sql` to populate a realistic footprint for that account.
5. The app auto-detects the session and switches from demo to live, RLS-scoped
   data. Sign-in is required for `/dashboard`; signed-out users still get the
   demo experience.

### How live ⇄ demo switching works

`getDataSource()` (`src/lib/data/index.ts`) returns the live `SupabaseDataSource`
only when Supabase is configured **and** a user is signed in; otherwise the
`DemoDataSource`. Every dashboard page and the `/api/protect` route depend on
this interface, never on Supabase or the demo arrays directly.
