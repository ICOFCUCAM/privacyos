# Business / Brand Protection OS

**Surface:** `/dashboard/business` (+ `domains`, `employees`, `third-party`)
**Engine:** `src/lib/business/os/brand-os.ts` (+ the existing domain / workforce / vendor engines)
**Status:** implemented

Unifies the organization's siloed corporate-exposure signals — domain risks,
workforce exposure, third-party/vendor risk, leaked credentials — into one
**Brand Risk Score**, and isolates **brand impersonation** (lookalike / phishing
domains). Pure, deterministic, unit-tested. No keys.

---

## 1. Brand Risk Score (`brand-os.ts`)

`brandRiskIndices(input)` → a composite `overall` (0–100, higher = more at risk)
plus four sub-indices:

| Index | Driven by |
|---|---|
| **Domain & brand** | unresolved `domainRisks` (typosquat, phishing, spoof, takeover…) |
| **Workforce** | `employeeExposures` |
| **Supply chain** | `thirdPartyRisks` (vendor assessments) |
| **Credentials** | `credentialLeaks` |

`brandBand(score)` buckets low / elevated / high / critical; the composite
weights domain & workforce most (0.3 each), supply-chain & credentials 0.2.

## 2. Brand impersonation

`brandImpersonation(domainRisks)` isolates the lookalike / phishing domains
impersonating the brand (unresolved, worst-first) — the corporate counterpart to
the principal-level impersonation pillar in ExecutiveOS.

## 3. Surface

`/dashboard/business` leads with the **Brand Risk Score** gauge + four sub-index
tiles and a **brand-impersonation** list, above the existing exposed-employees,
domain-risk and third-party sections. The per-domain / per-employee / per-vendor
detail lives on `domains`, `employees` and `third-party`, powered by
`intelligence/domain-risk-intel.ts`, `workforce-risk.ts` and `vendor-risk.ts`.

## 4. Report

The **Business Risk report** (`reports/build.ts`, type `business`,
`/api/reports/business`) now leads with the Brand Risk Score + sub-indices and a
brand-impersonation section, then credential leaks and domain risks.

## 5. File map

```
src/lib/business/os/
  brand-os.ts           Brand Risk Score, sub-indices, impersonation, overview
  brand-os.test.ts      unit tests (5)
src/lib/intelligence/   domain-risk-intel.ts, workforce-risk.ts, vendor-risk.ts (existing)
src/app/dashboard/business/page.tsx   Business/Brand OS hub
```

## 6. Not yet built (data-dependent)

- **Live typosquat discovery** (registrar/certificate-transparency feeds) behind
  a keyed connector — today domain risks come from the seeded register.
- A persisted **brand-risk trend** (computed at read time today).
