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
      <div className="relative w-full md:min-h-[600px] lg:min-h-[660px]">
        {/* Layer 1 — globe: large, upper/behind, bigger than the tablet */}
        {showGlobe && (
          <div className="pointer-events-none absolute -top-6 right-[-14%] z-0 h-[88%] w-full">
            <Globe count={count} reduced={reduced} />
          </div>
        )}

        {/* Layer 3 — ambient protection network */}
        <ProtectionNetwork />

        {/* Layer 2 — floating dashboard: overlaps the lower-left of the globe */}
        <div className="relative mx-auto w-full max-w-[22rem] pt-6 sm:max-w-[30rem] md:absolute md:bottom-4 md:left-0 md:mx-0 md:max-w-[28rem] md:pt-0 lg:bottom-6 lg:max-w-[32rem]">
          <ProtectionDashboard metrics={metrics} flat={flat} />
        </div>
      </div>
    </MotionConfig>
  );
}
