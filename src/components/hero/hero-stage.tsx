"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { ProtectionDashboard } from "./protection-dashboard";
import { ProtectionNetwork } from "./protection-network";
import type { HeroMetrics } from "./metrics";

// Three.js is heavy — load it only on the client, and only mount it on
// tablet/desktop (mobile shows the dashboard alone, per the brief).
const Globe = dynamic(() => import("./globe"), { ssr: false, loading: () => null });

type Mode = "mobile" | "tablet" | "desktop";

/**
 * The 3-layer hero stage: globe (atmosphere, behind) + protection network
 * (nodes) + floating dashboard (front, left-forward). Responsive + reduced-
 * motion aware; the WebGL globe never downloads on mobile.
 */
export function HeroStage({ metrics }: { metrics?: HeroMetrics }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const calc = () =>
      setMode(window.innerWidth >= 1024 ? "desktop" : window.innerWidth >= 768 ? "tablet" : "mobile");
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const showGlobe = mode === "desktop" || mode === "tablet";
  const flat = mode === null || mode === "mobile";
  const count = mode === "tablet" ? 420 : 720;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-[460px] w-full md:min-h-[520px] lg:min-h-[580px]">
        {/* Layer 1 — globe: background atmosphere, center-right, ~55–60% height */}
        {showGlobe && (
          <div className="pointer-events-none absolute right-[-10%] top-1/2 z-0 h-[58%] w-[78%] -translate-y-1/2 md:h-[62%]">
            <Globe count={count} reduced={reduced} />
          </div>
        )}

        {/* Layer 3 — ambient protection network */}
        <ProtectionNetwork />

        {/* Layer 2 — floating dashboard, front + left-forward */}
        <div className="relative z-10 mx-auto w-full max-w-[20rem] pt-8 sm:max-w-[22rem] lg:ml-0 lg:max-w-[23rem] lg:pt-12">
          <ProtectionDashboard metrics={metrics} flat={flat} />
        </div>
      </div>
    </MotionConfig>
  );
}
