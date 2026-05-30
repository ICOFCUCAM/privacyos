# PrivacyOS Roadmap

This foundation establishes the architecture, domain model, scoring engine,
agent orchestration layer, dashboard, and database schema. The roadmap below
sequences the path to a production, category-defining platform.

## Phase 1 — Foundation ✅ (this repo)
- Next.js + TypeScript + Tailwind app, multi-section dashboard
- 5-axis risk scoring engine (unit-tested)
- Agent orchestration layer with 8 specialized agents (unit-tested)
- Pluggable LLM provider (Claude / OpenAI / mock)
- Supabase schema with multi-tenant RLS
- Zero-config demo dataset + `POST /api/protect`

## Phase 2 — Live backend & auth ✅
- Supabase email + password auth, session-refresh middleware, `/dashboard`
  route guard, sign-out
- Data-access layer (`DataSource`) with RLS-scoped Supabase queries and an
  automatic live ⇄ demo fallback; row→domain mappers (unit-tested)
- Server actions for threat-acknowledge + recommendation-approve mutations
- `/api/protect` reads from the data source and persists runs to `agent_runs`
  + recommendations when live; seed script for a realistic footprint

### Phase 2 follow-ups
- ✅ Live module data: `getModuleData()` reads the 0002 suite tables (RLS-scoped)
  with pure row→domain mappers; seed populates every suite table
- SSO providers (Google/Microsoft) + onboarding flow to create the first
  `subject` in-app (instead of seed)
- ✅ Scheduled agent runs: `runScheduledCycle` + `/api/cron` (CRON_SECRET),
  `scheduled-protect` Edge Function, pg_cron migration (0003) and Vercel Cron —
  24/7 monitoring writing runs, actions, score snapshots and notifications
- `score_snapshots`-backed trend charts (table + writes exist; wire the read)

## Phase 3 — Real discovery connectors 🚧
- ✅ `DiscoverySource` interface + concurrent pipeline with failure isolation
  and content-based dedupe against the known footprint (unit-tested)
- ✅ Breach-database connector (HaveIBeenPwned + deterministic offline
  simulator), severity classification, exposure + acute-threat emission
- ✅ `POST /api/discover` + "Run discovery scan" UI; persists when live
- Next connectors: data-broker search/crawlers, search APIs, social platforms,
  archive.org
- Data-broker opt-out automation per broker (forms, email, API) with
  30/60/90-day reappearance re-checks
- Entity resolution to dedupe exposures across sources

## Phase 4 — Intelligence depth
- LLM-backed sentiment + classification for reputation monitoring
- Deepfake detection model integration (image/video/audio provenance)
- Impersonation detection: domain typosquat + fake-profile heuristics
- Dark-web monitoring integrations + severity ML

## Phase 5 — Enterprise & monetization
- Plans/billing (Stripe): Starter, Professional, Premium, Family; Business
  Startup/Growth/Enterprise; Executive VIP/Political/Celebrity tiers
- Team accounts, org-level dashboards, role-based access
- PDF report generation (executive, board, compliance, weekly/monthly/annual)
- SOC 2 controls, audit exports, data-residency options

## Phase 6 — Scale & autonomy
- Fully autonomous remediation with human-in-the-loop approval gates
- Continuous 24/7 agent fleet with backpressure + rate limiting
- Multi-region, observability, SLAs
