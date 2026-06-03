# Executive Protection OS

**Surface:** `/dashboard/executive` (+ tabbed sub-surfaces)
**Engines:** `src/lib/executive/os/`
**Status:** implemented

A VIP-grade executive-protection platform: one **Executive Risk Score** across
five indices, seven monitoring pillars (each with detection *and* an action
path), an at-a-glance command view, autonomous escalation into the protection
cycle, trend tracking, and an exportable client brief.

Every engine is **pure and unit-tested** and works in both demo and live modes.
External lookups follow the project's connector seam (injectable `fetch`,
timeout, `{ data, live }`, graceful fallback, key-gated).

---

## 1. Executive Risk Score (`risk-indices.ts`)

`executiveRiskIndices(input)` → a composite `overall` (0–100, higher = more at
risk) plus five sub-indices, each derived deterministically from the live
footprint:

| Index | Driven by |
|---|---|
| **Personal** | the principal's own exposures + active threats |
| **Physical** | address/family/photo exposures + doxxing/location threats |
| **Digital** | credential/email/username/financial exposures, dark-web/impersonation threats, **leaked credentials** (optional `credentialLeaks`) |
| **Family** | the family roster (minors weighted heavier) |
| **Travel** | the travel itinerary |

`bandFor(score)` buckets to low / elevated / high / critical. The composite
weights physical & family most. `riskRecommendations(input, indices)` turns each
elevated index into the single highest-impact protective action, ranked
worst-first (surfaced on the Overview as "Reduce executive risk").

> The scheduler computes this from exposures+threats only (no family/travel/
> credential feed in the footprint), so it under-reads there — which is why the
> autonomous escalation keys on the **physical** index, not the composite.

## 2. Attack Path Analysis — the kill-chain (`attack-paths.ts`)

The flagship feature. Instead of a flat exposure list, it models how an
adversary **chains** the footprint into real-world harm.

- `buildSignalIndex(input)` reduces exposures + threats + credential leaks to 14
  attack **signals** (address, phone, family, email, credential, darkweb,
  doxxing, location, impersonation, …).
- `analyzeAttackSurface(input)` scores six attack paths — swatting, stalking,
  identity theft, account takeover, extortion, pretexting — each
  feasibility × impact, **"live"** once ≥half its chain (and ≥2 links) are
  present. It then computes the **chokepoint**: the single signal whose removal
  collapses the most live paths (the "one shot").
- `simulateRemovals(input)` is the what-if leverage analysis: for every present
  signal it re-runs the surface with that signal removed and ranks by risk
  removed (`scoreDrop`) — a full "remove-this → gain-that" playbook.

Surface: the **Attack Paths** tab (`/attack-paths`) — chokepoint hero, each path
drawn as a lit/struck-through kill-chain, and the leverage table. The chokepoint
also appears as a banner on the **Command Center** (`/dashboard`) and the
Executive **Overview**.

## 3. Monitoring pillars

| Pillar | Engine | Surface | Detects | Acts |
|---|---|---|---|---|
| **Residence** | `residence.ts` (+ `residence-connector.ts`, `residence-cache.ts`) | `/residence` | address exposure, property records, satellite/street-view, home listing | takedown actions; **live property data** when keyed |
| **Doxxing** | `doxxing.ts` | `/doxxing` | address / phone / family / employer leaks | routes each leak to a takedown channel (`takedownPlan`) |
| **Impersonation** | `impersonation.ts` | `/impersonation` | fake profiles, deepfakes, lookalike/phishing domains, synthetic media | per-category takedown plan; surfaces `impersonation_takedown` / `deepfake_incident` cases |
| **Dark web** | `darkweb.ts` | `/dark-web` | leaked credentials, dark-web mentions, breach records (+ records-exposed total) | per-category remediation plan |
| **Threat actors** | `threat-actors.ts` | `/threat-actors` | threats clustered into actor profiles, escalation, harassment | **auto-opens `executive_protection` cases** for active/harassment actors |
| **Family** | `intelligence/family-protection.ts` | `/dashboard/family` | per-member risk + safeguards | Family Risk Index |
| **Travel** | `intelligence/travel-risk.ts` | `/dashboard/travel` | per-trip risk vs live exposure | Travel Security Index |

**Command** (`command.ts`, `/command`) is the at-a-glance view: a
`protectionCoverage` rollup across all seven pillars, an exposure heat map
(category × severity), an exposure-by-category graph, and the threat timeline.

## 4. Live data & keys

| Capability | Provider | Env var | Cache (table, TTL) |
|---|---|---|---|
| Residence property records / listing / map visibility | ATTOM-style property API | `PROPERTY_DATA_API_KEY` | `residence_cache`, 30d |

Without the key, the residence checks **infer** from address exposures (the tab
shows an "Inferred" vs "Property data" badge). All other pillars run on data the
platform already collects (exposures, threats, incidents, domain risks,
credential leaks, the family roster, the travel itinerary).

Connectors share `src/lib/net/keyed-fetch.ts`; per-user caches share
`src/lib/data/cache-session.ts` (no session → skip the cache *and* the paid
call).

## 5. Autonomous behavior (in the protection cycle, `scheduler/run.ts`)

Each cycle, per subject:
- recomputes the Executive Risk Score and records it as a **score snapshot**
  (`kind: "executive"`) + an Executive-Agent activity;
- **escalates** (critical incident notification + `escalate` action) when a new
  critical finding pushes the **physical** index critical;
- clusters threats into actors and **auto-opens `executive_protection` cases**
  for active/harassment actors (deduped by title);
- routes the footprint's doxxing leaks to takedown channels and records the plan;
- sweeps impersonation/deepfake and dark-web signals (observability);
- runs the **attack-path analysis** and records the chokepoint (the
  highest-leverage fix) + the count of live paths.

Run-summary counters: `executiveEscalations`, `executiveCasesOpened`,
`doxxingTakedownsRouted`, `impersonationSignals`, `darkWebSignals`,
`attackPathsLive`.

## 6. Cross-surface wiring

- **Mission Control** factors the Executive Risk Score **and a live critical
  attack path** into the unified posture (critical ≥75 / elevated ≥50 drivers;
  attack top-score ≥70 critical / ≥45 elevated) and shows "Executive risk" +
  "Attack paths" tiles.
- **Command Center** (`/dashboard`) shows the attack-path chokepoint as a
  "one shot" banner.
- **Executive Protection report** (`reports/build.ts`, type `executive`) renders
  the five indices, all seven pillars, the **attack paths + chokepoint**, and
  (when keyed) live residence data.
- The Executive Risk Score is **trend-charted** on the Overview from the
  persisted snapshots.

## 7. File map

```
src/lib/executive/os/
  attack-paths.ts      kill-chain: signals, paths, chokepoint, what-if leverage
  risk-indices.ts      Executive Risk Score, indices, recommendations
  residence.ts         residence checks (+ -connector, -cache for live data)
  doxxing.ts           leak classification + takedown routing
  impersonation.ts     fake profiles / deepfakes / lookalike domains
  darkweb.ts           credentials / mentions / breach records
  threat-actors.ts     actor clustering, escalation, protective cases
  command.ts           heat map / exposure graph / timeline
  coverage.ts          seven-pillar protection-coverage rollup
  *.test.ts            unit tests for every engine
src/app/dashboard/executive/
  page.tsx + tabs.tsx + attack-paths/ residence/ doxxing/ impersonation/
  dark-web/ threat-actors/ command/
```

## 8. Not yet built (paid-partner / data-dependent)

- Independent **satellite/street-view** detection (currently inferred or via the
  property record's geocode).
- **Geographic** threat heat map (needs per-event location data).
- A persisted **per-index** history (only the composite executive score is
  snapshotted today), which would enable per-index movement deltas.
