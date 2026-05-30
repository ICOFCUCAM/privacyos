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

## Phase 2 — Live backend & auth
- Wire Supabase auth (email + SSO), onboarding to create a `subject`
- Replace demo data accessors with RLS-scoped queries
- Server actions / route handlers for case + recommendation mutations
- Supabase Edge Functions to run agents on a schedule (cron)

## Phase 3 — Real discovery connectors
- `DiscoverySource` interface + connectors: search APIs, broker crawlers,
  breach feeds (HIBP-style), social platforms, archive.org
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
