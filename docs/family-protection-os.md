# Family Protection OS

**Surface:** `/dashboard/family`
**Engine:** `src/lib/family/os/family-os.ts`
**Status:** implemented

Protects the principal's household — spouse, children, parents and relatives —
with a categorized registry, exposure-vector tracking, child safety (minor
monitoring + alerts + risk scoring), and a family graph that **propagates the
principal's shared household exposures to each relative**. Pure, deterministic,
unit-tested; works in demo and live modes off the family roster + the
principal's footprint.

---

## 1. Family Registry

`categorizeRelation(relation)` buckets each roster member into
**spouse / child / parent / relative** (regex on the relation text);
`buildRegistry(members)` groups them (non-empty, ordered) for the registry grid.

## 2. Exposure Tracking

`exposureTracking(members, exposures)` scores four exposure vectors, each
clear / monitoring / exposed from **real signals**:

| Vector | Signal |
|---|---|
| **Photos / likeness** | the principal's `photo` + `ai_generated` exposures (shared likeness) |
| **School records** | minors on the registry |
| **Social profiles** | members with a discoverable footprint (`exposuresCount > 0`) |
| **Location exposure** | the principal's `address` exposure — locates the whole household |

## 3. Child Safety

`childSafety(memberRisks)` provides **minor monitoring** (every minor tracked),
**exposure alerts** (minors over the risk threshold, plus any high/critical
member), and **per-child risk scoring** (own + inherited risk, 0–100).

## 4. Family Graph & risk propagation

The differentiator. `sharedExposures(exposures)` isolates the household-shared
categories (`address`, `family`, `photo`); `memberRisks(members, shared)`
computes each relative's **own** risk + **inherited** household risk (minors
weighted heavier — 0.7 vs 0.5 — since they can't remediate shared exposures
themselves) → a combined 0–100 total. `buildFamilyGraph(...)` assembles the
relationship map and propagation reach.

Rendered as a **radial SVG** (`components/family-graph-view.tsx`): the principal
at centre, relatives as risk-sized/coloured nodes, edges weighted by inherited
risk (solid = inheriting, dashed = not; minors flagged). So a public home
address is *seen* radiating risk into every household member.

`familyOverview(members, exposures)` rolls up members / minors / mean family
risk / alerts / propagation reach.

## 5. Report

The **Family Protection report** (`reports/build.ts`, type `family`,
`/api/reports/family`) renders the registry, child-safety alerts, the four
exposure vectors, risk propagation and per-member risk — a print-ready
family-office deliverable.

## 6. Data sources

Runs entirely on data the platform already has: the `familyMembers` roster
(`getModuleData`) and the principal's `exposures` (`getDataSource`). No keys.

## 7. File map

```
src/lib/family/os/
  family-os.ts          registry, exposure tracking, child safety, graph, propagation
  family-os.test.ts     unit tests (9)
src/components/family-graph-view.tsx   radial SVG visualization
src/app/dashboard/family/page.tsx      Family Protection OS surface
```

The earlier `src/lib/intelligence/family-protection.ts` (per-member safeguards +
family posture) still powers the posture gauge, priority safeguards and member
cards on the same page.

## 8. Not yet built (data-dependent)

- **Per-member exposure detail** — the roster carries an `exposuresCount`, not
  categorized per-member exposures; the exposure vectors infer type from the
  footprint + roster rather than from member-attributed records.
- A persisted **family-risk trend** (the executive score is snapshotted; family
  risk is computed at read time).
