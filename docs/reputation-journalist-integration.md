# Design draft — Live journalist database (ReputationOS → Media)

**Status:** proposal · not yet implemented
**Surface:** `/dashboard/reputation/media` → "Journalist database"
**Today:** `journalistDatabase(subject)` in `src/lib/reputation/os/media.ts` returns a
curated, deterministic list. This draft describes what wiring it to live data takes.

---

## 1. Goal

Replace the static journalist list with **real journalists relevant to the
principal's beat**, ranked by relevance, so media outreach targets actual people
at real outlets — and (phase 2) enrich the existing press-release + outreach
workflow with contactable, verified records.

## 2. The hard constraint

There is **no clean, low-cost, self-serve "journalist API"** the way there is for
search (Serper/Olostep) or breaches (HIBP). The real databases are enterprise PR
SaaS with sales-gated, expensive contracts and strict ToS on contact data:

| Provider | What it gives | Auth / access | Cost | Notes |
|---|---|---|---|---|
| **Muck Rack** | Journalist profiles, beats, recent articles, contact | API, sales-gated | $$$$ (enterprise) | Best data; contract + seat minimums |
| **Prowly** (Semrush) | Media DB, pitching, contacts | API on higher tiers | $$$ | More self-serve than Muck Rack |
| **Cision / Meltwater** | Largest media DBs | Enterprise only | $$$$ | Heavy contracts |
| **RocketHunter / Hunter.io** | Email discovery for a domain | Self-serve API key | $ | Finds emails, *not* journalist/beat data |
| **NewsAPI / GDELT** | Articles + (sometimes) author bylines | keyless/cheap | free–$ | No contact data; bylines only |

**Implication:** a true contact-grade journalist DB is a **paid data-partner
decision**, not a weekend integration. But we can ship a genuinely useful
**keyless phase 1** from data we already pull.

## 3. Recommended phased plan

### Phase 1 — Byline discovery (keyless, real, ship-now) ✅ recommended first
Derive a live "journalists" list from the **news articles we already collect** via
the GDELT connector (`src/lib/reputation/news-connector.ts`). Each recent news
mention has an outlet (domain) and often an author byline.

- **Source:** existing GDELT/news mentions for the subject (no new key, no new cost).
- **Build:** group mentions by outlet, extract author where present, score
  relevance by recency + sentiment (a journalist already covering the principal
  positively is the warmest target).
- **Output:** real outlets + (where available) real author names actively writing
  about the principal or the sector — strictly better than today's static list.
- **Honesty:** mark records "from coverage" vs. the curated fallback.

### Phase 2 — Contact enrichment (cheap key, optional)
Layer **Hunter.io** (self-serve API key) to resolve a likely email for a
byline + outlet domain, so Phase-1 journalists become contactable.

- **Auth:** `HUNTER_API_KEY` (self-serve).
- **Scope:** email-pattern guess + verification only; respects per-domain limits.
- **Caching:** persist resolved emails (like `serp_cache`) to avoid re-billing.

### Phase 3 — Full media DB (enterprise, when justified)
Add a `MuckRack`/`Prowly` provider behind the same seam when there's a contract.
This is the only way to get verified beats + opt-in contact data at scale.

## 4. Architecture (mirrors the SERP seam)

Reuse the exact connector pattern already proven for SERP/podcasts/news:
injectable `fetch`, timeout + `AbortController`, `{ journalists, live, provider }`,
graceful fallback, never throws.

```ts
// src/lib/reputation/os/journalist-connector.ts
export interface JournalistRecord {
  name: string;
  outlet: string;
  beat: string;
  relevance: number;        // 0–100
  email?: string;           // phase 2 only
  recentArticleUrl?: string;
  provider: "coverage" | "hunter" | "muckrack" | "prowly" | "curated";
}

export interface JournalistSource {
  find(subject: Subject, beat: string, limit?: number):
    Promise<{ journalists: JournalistRecord[]; live: boolean }>;
}

// Phase 1: derive from the mentions we already have (no network).
export function journalistsFromCoverage(mentions: Mention[], limit = 8): JournalistRecord[];

// Phase 2/3: real providers behind the same interface.
export class HunterJournalistSource implements JournalistSource { /* HUNTER_API_KEY */ }
export class MuckRackJournalistSource implements JournalistSource { /* contract */ }

// Precedence: MuckRack/Prowly → Hunter enrichment → coverage → curated fallback.
export function resolveJournalistSource(env = process.env): JournalistSource;
```

**Wiring point:** `media.ts` → `journalistDatabase()` becomes live-aware
(`mediaProgram` already composes it). The Media page shows a **Live / Curated**
badge exactly like SEO's "Live · Google / Modeled".

## 5. Effort & risk

| Item | Effort | Risk |
|---|---|---|
| Phase 1 (byline discovery) | ~½ day, fully testable, **no cost** | Low — bylines aren't always present in GDELT |
| Phase 2 (Hunter enrichment) | ~½ day + key | Medium — email guesses need verification; rate limits; cache to control cost |
| Phase 3 (Muck Rack/Prowly) | ~1 day + **sales contract** | High — cost, procurement, ToS on contact storage |
| Compliance | — | **Contact data = PII.** Storing journalist emails brings GDPR/CAN-SPAM duties; outreach must honor opt-outs. Keep records subject-scoped + RLS, like every other table. |

## 6. Recommendation

Ship **Phase 1 now** (keyless, real, from existing coverage) to make the
journalist list genuinely live with zero new dependency. Add **Phase 2 (Hunter)**
only if outreach needs real emails. Defer **Phase 3** until a paid media-DB
contract is actually warranted — that's a business/procurement decision, not a
technical blocker.

Same applies to the other curated Intelligence lists (influencer / partnership /
speaking): no clean API exists, so each is a "real provider = paid partner"
decision. Podcasts are already live via the keyless iTunes API as the model.
