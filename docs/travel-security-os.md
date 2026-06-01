# Travel Security OS

**Surface:** `/dashboard/travel`
**Engines:** `src/lib/intelligence/travel-risk.ts` (per-trip) + `src/lib/travel/os/travel-os.ts` (module)
**Status:** implemented

Pre-travel risk for the principal's itinerary: each trip is correlated with the
live exposure + threat footprint, then rolled up into a phased registry,
per-destination intelligence, and a pre-travel readiness score. Pure,
deterministic, unit-tested; runs on the `travelAlerts` itinerary + the
principal's footprint. No keys.

---

## 1. Per-trip assessment (`travel-risk.ts`)

`assessTrips(alerts, exposures, threats)` scores each trip (`riskScore`,
`posture` low/guarded/elevated/high), correlating the destination advisory with
the principal's live exposures/threats, and produces **protective measures**
(critical/high/standard) + risk factors. `summarizeTravel` gives the headline
KPIs. The **Travel Security Index** comes from
`executiveRiskIndices(...).travel`.

## 2. Module views (`travel-os.ts`)

- **Trip registry** — `tripRegistry(trips)` phases trips into
  active / upcoming / unscheduled / completed (by `daysUntil`), worst-risk first
  within each phase.
- **Destination intelligence** — `destinationIntel(trips)` aggregates by
  destination (trip count, highest risk, posture, advisory, next departure),
  worst posture first.
- **Pre-travel readiness** — `travelReadiness(trips)` scores 0–100 from the
  outstanding critical/high protective measures on upcoming/active trips (falls
  as measures pile up; 100 when nothing is upcoming).
- **`travelOverview`** — trips / upcoming / destinations / highest posture /
  mean risk rollup.

## 3. Surface

`/dashboard/travel`: Travel Security Index + highest-posture badges, a KPI
strip, a **pre-travel readiness** gauge, a **destination-intelligence** list,
and the itinerary rendered as a **phased trip registry** with per-trip cards
(factors + protective measures).

## 4. Report

The **Travel Security report** (`reports/build.ts`, type `travel`,
`/api/reports/travel`) renders destination intelligence, readiness, and the
phased itinerary — a per-trip, print-ready brief.

## 5. File map

```
src/lib/travel/os/
  travel-os.ts          registry, destination intel, readiness, overview
  travel-os.test.ts     unit tests (6)
src/lib/intelligence/travel-risk.ts   per-trip assessment (existing)
src/app/dashboard/travel/page.tsx     Travel Security OS surface
```

## 6. Not yet built (data-dependent)

- Trips carry a single `travelDate` (no end date), so "active" means day-of;
  a start/end window would enable true in-trip tracking.
- **Live destination advisories** (e.g., government travel-advisory feeds)
  behind a keyed connector — today the advisory text comes from the itinerary
  record.
