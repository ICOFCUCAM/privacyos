# PrivacyOS — Consolidated Project Review

A build-to-date review of the PrivacyOS platform: what exists, how it fits
together, how it's tested, and how to ship it. For the design rationale see
[`ARCHITECTURE.md`](./ARCHITECTURE.md); for the feature audit see
[`CAPABILITY_MATRIX.md`](./CAPABILITY_MATRIX.md); for forward work see
[`ROADMAP.md`](./ROADMAP.md).

## 1. Executive summary

PrivacyOS is an AI-powered Privacy, Reputation, Identity Protection and Digital
Risk Management platform, organized into four suites (**PrivacyOS**,
**ReputationOS**, **ExecutiveOS**, **BusinessOS**) plus an automation layer. It
is a runnable Next.js application with a multi-tenant Supabase backend, an
autonomous agent fleet, real remediation workflows, and 24/7 scheduled
monitoring — and it stays fully explorable with **zero configuration** via a
deterministic demo dataset.

| Metric | Value |
| --- | --- |
| Commits (feature history) | 15 |
| Source files (ts/tsx) | 100+ |
| Lines of source | ~8,000 |
| Unit/integration tests | 12 files / **57** |
| E2E specs (Playwright, CI) | 4 |
| Database tables | 28 (3 migrations) |
| Dashboard pages | 22 |
| API routes | 5 |
| Supabase Edge Functions | 1 |

Quality gates on every commit: `tsc --noEmit` clean · `vitest` 57/57 green ·
`next build` succeeds (~27 routes).

## 2. Build history (what shipped, in order)

1. **Foundation** — Next.js 15 + TS + Tailwind, risk-scoring engine, 8-agent
   orchestrator, schema, demo dataset.
2. **Live backend & auth** — Supabase email/password, middleware route guard,
   `DataSource` abstraction with live⇄demo auto-switch, mutations.
3. **Discovery pipeline** — `DiscoverySource` interface + breach connector
   (HIBP / offline sim), `/api/discover`.
4. **Four product suites** — schema 0002 (20+ tables), 6-axis scoring, 5 more
   discovery layers, legal engine (6 docs), reporting engine (7 reports), and
   dashboards for every module.
5. **AI Assistant** — the "Protect me" screen wrapping the orchestrator.
6. **Live module data** — `getModuleData()` reads the suite tables; seed.
7. **Always-on monitoring** — `runScheduledCycle` + `/api/cron` + Edge Function
   + pg_cron + Vercel Cron.
8. **Trend charts** — `score_snapshots` surfaced on the Overview.
9. **In-app onboarding** — create first subject + initial scan.
10. **Broker removal automation** — registry + 30/60/90 re-check state machine,
    autonomous via the scheduler.
11. **Entity resolution** — union-find clustering of cross-source duplicates.
12. **Audit logging** — `recordAudit` wired into actions + Compliance Center.
13. **Settings** — edit the monitored subject.
14. **SSO** — Google/Microsoft via Supabase OAuth + PKCE callback.

## 3. Architecture at a glance

```
Next.js App Router (src/app)
  Landing · /login (+SSO) · /onboarding · 22 dashboard pages · 5 API routes
        │ depends on interfaces, never vendors
Domain & engines (src/lib)
  types · scoring (risk + 6 axes) · agents (orchestrator + 8 agents + LLM)
  discovery (pipeline + 6 connectors + entity resolution)
  brokers (registry + removal state machine) · legal · reports · scheduler
  audit · data (DataSource + module readers, live⇄demo)
        │ persists via
Supabase: PostgreSQL (28 tables, RLS, indexes, triggers) · Edge Function · pg_cron
```

**Key seams (swap implementations without touching callers):**
- `DataSource` / `getModuleData` / `getScoreHistory` — live Supabase ⇄ demo.
- `LLMProvider` — Anthropic ⇄ OpenAI ⇄ deterministic mock.
- `DiscoverySource` — real APIs ⇄ deterministic mock connectors.
- `SchedulerStore` — service-role Supabase ⇄ in-memory (tests).

**Design invariants:** every tenant row is RLS-scoped to `auth.uid()`; scores are
pure and explainable; scheduled and interactive runs share one code path; the
app never shows an empty state.

## 4. Capability coverage

All four suites and the autonomous agent layer are implemented and operational
(see `CAPABILITY_MATRIX.md` for the per-feature before/after). Highlights:

- **PrivacyOS** — discovery (6 layers, deduped), exposure inventory, dark-web /
  breach monitoring, broker removals with recurring re-checks, AI assistant.
- **ReputationOS** — mentions, sentiment trend, defamation flags, SEO recovery.
- **ExecutiveOS** — deepfake/impersonation/doxxing incidents, family, travel risk.
- **BusinessOS** — domains, employee exposure, credential leaks, third-party risk.
- **Automation** — 8 agents, legal generator, 7 reports, audit log, notifications,
  settings, 24/7 scheduler.

## 5. Test coverage

`vitest` — 45 tests across the pure/critical logic:

| Area | Tests |
| --- | --- |
| Risk scoring (`risk-score`) | 6 |
| Suite scoring (`scores`) | 4 |
| Agent orchestrator | 4 |
| Discovery pipeline + breach | 7 |
| Entity resolution | 7 |
| Broker removal workflow | 5 |
| Scheduler cycle | 3 |
| Data mappers / module mappers | 3 / 3 |
| Audit helpers | 3 |
| Certificate-transparency connector | 5 |
| **Route-handler integration** (`api/routes.test.ts`) | 7 |

Plus a **Playwright E2E** suite (`e2e/smoke.spec.ts`, 4 specs) covering landing,
dashboard overview, suite navigation, and a live "Protect me" run via
`npm run test:e2e`. The strategy targets pure domain logic (scoring, state
machines, clustering, orchestration) plus the route contracts, with IO behind
interfaces.

## 6. Deployment checklist

**Prerequisites**
- [ ] Supabase project created; URL + anon key + service-role key to hand.
- [ ] Hosting target chosen (Vercel recommended; any Node host works).

**Database**
- [ ] Apply migrations in order: `0001_init.sql`, `0002_suites.sql`, `0003_cron.sql`.
- [ ] (Optional) Run `supabase/seed.sql` for a populated demo account.
- [ ] Confirm RLS is enabled on all tables (the migrations do this).

**Environment variables** (see `.env.example`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only; scheduler)
- [ ] `NEXT_PUBLIC_SITE_URL` (production origin; OAuth redirects)
- [ ] `CRON_SECRET` (guards `/api/cron`)
- [ ] `APP_URL` (Edge Function → `/api/cron`)
- [ ] Optional: `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` + `PRIVACYOS_LLM_PROVIDER`; `HIBP_API_KEY`

**Auth / SSO**
- [ ] Enable Google and/or Microsoft (Azure) in Supabase → Auth → Providers.
- [ ] Add `<NEXT_PUBLIC_SITE_URL>/auth/callback` to allowed redirect URLs.

**Scheduler (24/7 monitoring)** — pick one trigger:
- [ ] Supabase: deploy `scheduled-protect`, set `app.cron_url` + `app.cron_secret`, apply `0003_cron.sql`; **or**
- [ ] Vercel Cron: `vercel.json` is preconfigured (set `CRON_SECRET`); **or**
- [ ] External scheduler POSTing to `/api/cron` with the bearer secret.

**Verify**
- [ ] `npm ci && npm run typecheck && npm test && npm run build` all pass.
- [ ] Sign up / SSO → onboarding → "Run discovery scan" populates the dashboard.
- [ ] Trigger `/api/cron` once; confirm `agent_runs` + `score_snapshots` rows and
      the Overview trend updates.

## 7. Known limitations / honest status

- **Discovery connectors are mostly mock-backed.** Two hit real external
  sources: the breach connector (HIBP, when `HIBP_API_KEY` is set) and the
  **Certificate Transparency connector** (crt.sh, keyless) which discovers
  exposed subdomains and degrades to a deterministic fallback when egress is
  blocked. The remaining search/news/social/dark-web layers are mock providers
  behind the same `DiscoverySource` interface.
- **E2E requires a browser install** (`npx playwright install chromium`), which
  was blocked in the build sandbox; the specs and config run in CI. The unit +
  route integration suite (57 tests) runs everywhere.
- **PDF reports** are print-ready HTML (browser Save-as-PDF); a server-side PDF
  renderer can drop in behind `renderReport`.
- **OAuth round-trip** requires a configured Supabase project with providers
  enabled; the code path, PKCE callback and error handling are complete.
- **Deepfake/sentiment/impersonation detection** are represented at the
  data/workflow layer; ML model integration is future work.
- No load testing, no formal SOC 2 controls yet (audit log + RLS are in place).
