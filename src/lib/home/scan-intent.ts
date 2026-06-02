/**
 * Scan intent — the through-line that carries the free scan's conclusion across
 * the auth boundary so the funnel never forgets what it already learned.
 *
 * The free scan figures out who the visitor is (name), the single right plan,
 * and their protection profile. Without this, all of that is lost the moment we
 * send them to sign in — they re-pick a plan and re-type their name. We stash it
 * in a cookie when the scan runs; `/start` reads it to resume checkout and
 * onboarding reads it to pre-fill. Pure + unit-tested.
 */

import type { ProtectionProfile } from "./protection-profile";
import { PLANS } from "@/lib/billing/plans";

/** Cookie carrying the scan's conclusion through signup → checkout → onboarding. */
export const INTENT_COOKIE = "po_intent";

export interface ScanIntent {
  /** What the visitor typed (used to pre-fill onboarding). */
  name: string;
  /** The single recommended plan. */
  planId: string;
  /** The dominant protection profile. */
  profile: ProtectionProfile;
  /** Total exposures found and the count still at risk after free removals. */
  found: number;
  remaining: number;
}

const PROFILES: ProtectionProfile[] = ["personal", "family", "reputation", "executive", "business"];

/** The onboarding subject types. */
export type SubjectType = "individual" | "executive" | "family_member" | "business";

/** Map a scan profile onto the onboarding subject type so we can pre-select it. */
export function profileToSubjectType(profile: ProtectionProfile): SubjectType {
  switch (profile) {
    case "executive":
      return "executive";
    case "family":
      return "family_member";
    case "business":
      return "business";
    default:
      return "individual"; // personal, reputation
  }
}

/** Encode an intent for cookie storage (compact, opaque to the user). */
export function encodeIntent(intent: ScanIntent): string {
  return Buffer.from(JSON.stringify(intent), "utf8").toString("base64url");
}

/**
 * Safely decode an untrusted cookie value into a validated intent, or null.
 * The plan id is validated against the catalog and the profile against the
 * union; anything malformed yields null so callers can fall back cleanly.
 */
export function decodeIntent(raw: string | undefined): ScanIntent | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<ScanIntent>;
    const planId = typeof obj.planId === "string" && PLANS.some((p) => p.id === obj.planId) ? obj.planId : "";
    if (!planId) return null;
    const name = typeof obj.name === "string" ? obj.name.slice(0, 80) : "";
    const profile = PROFILES.includes(obj.profile as ProtectionProfile)
      ? (obj.profile as ProtectionProfile)
      : "personal";
    const found = Number.isFinite(obj.found) ? Math.max(0, Number(obj.found)) : 0;
    const remaining = Number.isFinite(obj.remaining) ? Math.max(0, Number(obj.remaining)) : 0;
    return { name, planId, profile, found, remaining };
  } catch {
    return null;
  }
}
