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

## Security & multi-tenancy

- Row-level security on every table keyed to `auth.uid()`.
- Service-role key is server-only and never shipped to the client.
- LLM keys live server-side; agents run in server contexts (API routes / Edge
  Functions).
- `agent_runs` is an append-only audit log for compliance.
