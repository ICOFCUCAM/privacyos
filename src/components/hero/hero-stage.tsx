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
      <div className="relative min-h-[440px] w-full md:min-h-[560px] lg:min-h-[620px]">
        {/* Layer 1 — globe: bigger than the tablet, center-right, behind */}
        {showGlobe && (
          <div className="pointer-events-none absolute right-[-16%] top-1/2 z-0 h-[96%] w-[104%] -translate-y-1/2">
            <Globe count={count} reduced={reduced} />
          </div>
        )}

        {/* Layer 3 — ambient protection network */}
        <ProtectionNetwork />

        {/* Layer 2 — floating landscape dashboard, front + left-forward */}
        <div className="relative z-10 mx-auto w-full max-w-[22rem] pt-8 sm:max-w-[30rem] lg:ml-0 lg:max-w-[31rem] lg:pt-16">
          <ProtectionDashboard metrics={metrics} flat={flat} />
        </div>
      </div>
    </MotionConfig>
  );
}
