import type { RiskLevel } from "@/lib/types";

// Type-only re-exports for the client component (no engine code in the bundle).
export type { MirrorCategory, MirrorFinding, FixStep, ScaryMirrorReport } from "@/lib/home/scary-mirror";
export type RiskTone = RiskLevel;
