# PrivacyOS Architecture

## Design principles

1. **Outcomes, not complexity.** The user says "Protect me"; agents do the work.
2. **Explainable risk.** Scores are deterministic and unit-tested so they can be
   defended in compliance and executive reporting.
3. **Provider-agnostic AI.** Agents depend on an `LLMProvider` interface, never a
   vendor SDK. The platform is fully runnable with zero keys (mock provider).
4. **Graceful degradation.** No Supabase → deterministic demo dataset. The
   product is always explorable.
5. **Multi-tenant by default.** Every row is owned by an auth user and guarded by
   row-level security.

## Layers

```
┌───────────────────────────────────────────────────────────┐
│  Next.js App Router (src/app)                              │
│  Landing · Dashboard (11 sections) · /api/protect          │
└───────────────────────────────────────────────────────────┘
                  │ uses
┌───────────────────────────────────────────────────────────┐
│  Domain & engines (src/lib)                                │
│  • types.ts            — shared domain model               │
│  • scoring/            — 5-axis risk model (tested)        │
│  • agents/             — orchestrator + 8 agents (tested)  │
│      └ llm/provider.ts — Claude / OpenAI / mock            │
│  • data/demo.ts        — zero-config dataset               │
│  • supabase/           — server client (graceful null)     │
└───────────────────────────────────────────────────────────┘
                  │ persists to
┌───────────────────────────────────────────────────────────┐
│  Supabase: PostgreSQL + RLS (supabase/migrations)          │
│  subjects · exposures · threats · cases · removal_requests │
│  recommendations · agent_runs (audit)                      │
└───────────────────────────────────────────────────────────┘
```

## Risk scoring model (`src/lib/scoring/risk-score.ts`)

- Each exposure has a **level weight** (low→critical), scaled by a **status
  multiplier** (removed exposures count for ~5%) and a **recency boost**.
- Exposures map onto five axes — identity, reputation, financial, security,
  family — via a category→axis weight matrix.
- Unacknowledged threats add an acute contribution on top of the standing
  footprint.
- A logistic compression maps the unbounded accumulation to 0–100 that
  saturates below 100. The whole model is pure and unit-tested.

## Agent orchestration (`src/lib/agents/`)

Each agent extends `BaseAgent` and implements `run(ctx) → AgentResult`
(findings + threats + recommendations + log). The **orchestrator** runs them
with `Promise.allSettled` so one failure never breaks the run, then sorts
recommendations by projected impact and computes `projectedRisk`.

| Agent | Responsibility |
| --- | --- |
| Discovery | Scan internet/brokers/breach feeds; build exposure inventory |
| Privacy | Data-broker opt-outs + recurring re-checks |
| Legal | Draft GDPR/CCPA requests, complaints, evidence packets |
| Reputation | Sentiment, search visibility, recovery plans |
| Security | Breach & dark-web monitoring, breach response |
| Deepfake | Detect synthetic media / voice clones; takedown evidence |
| Executive | VIP-grade doxxing/location/family protection |
| Business | Org credential, asset, document & brand-impersonation defense |

Agents are designed to run continuously (scheduled via Supabase cron / Edge
Functions in production) and write `agent_runs` audit records.

## Discovery pipeline (`src/lib/discovery/`)

Where the footprint becomes real. Each connector implements `DiscoverySource`
(`scan(input) → { exposures, threats, log }`). `runDiscovery()` executes sources
with `Promise.allSettled` (failure isolation), then dedupes findings by a
content signature (`dedupeKey`) against the known footprint and within the
batch, returning only genuinely new items.

- `BreachConnector` checks each subject email against breach DBs — HaveIBeenPwned
  when `HIBP_API_KEY` is set, otherwise a deterministic offline simulator so it
  runs and tests with zero keys. Severity is classified from exposed data
  classes; critical breaches also raise an acute `credential_leak` threat.
- `POST /api/discover` runs the pipeline for the primary subject and persists new
  findings via the data source when live. The "Run discovery scan" button on the
  Exposure Inventory page triggers it and refreshes server data.

## Data-access layer (`src/lib/data/`)

Pages and API routes depend on a `DataSource` interface, never on Supabase or
the demo arrays directly:

- `getDataSource()` returns `SupabaseDataSource` when configured **and** signed
  in, else `DemoDataSource`.
- `SupabaseDataSource` issues RLS-scoped queries; row→domain translation lives
  in pure, unit-tested `mappers.ts`.
- `DemoDataSource` serves the deterministic dataset; mutations are no-ops.
- This gives graceful degradation (always explorable) and a single seam to
  swap persistence.

The suite modules (ReputationOS / ExecutiveOS / BusinessOS / legal / reporting)
go through `getModuleData()` (`src/lib/data/modules.ts`), which is also
live-aware: signed in + configured → RLS-scoped reads across the 0002 tables
(mapped by pure functions in `module-mappers.ts`); otherwise the deterministic
mock. Per-table query failures degrade to empty rather than breaking the page.
`supabase/seed.sql` populates every suite table for a signed-up user.

## Auth & sessions

- Email + password via Supabase, with server actions (`src/app/auth/actions.ts`).
- `middleware.ts` refreshes the session on every request and guards
  `/dashboard`; in demo mode (no keys) it is a pass-through.
- Mutations are server actions that call the data source and `revalidatePath`.

## Security & multi-tenancy

- Row-level security on every table keyed to `auth.uid()`.
- Service-role key is server-only and never shipped to the client.
- LLM keys live server-side; agents run in server contexts (API routes / Edge
  Functions).
- `agent_runs` is an append-only audit log for compliance.
