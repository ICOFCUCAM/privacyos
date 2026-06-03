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
  const quality: "high" | "med" = mode === "tablet" ? "med" : "high";

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex w-full items-center justify-center lg:min-h-[540px]">
        {/* Layer 1 — digital Earth: supports the device (smaller, shifted left) */}
        {showGlobe && (
          <div className="pointer-events-none absolute inset-0 z-0 opacity-90">
            <div className="absolute left-[46%] top-1/2 h-[110%] w-[110%] -translate-x-1/2 -translate-y-1/2">
              <Globe quality={quality} reduced={reduced} />
            </div>
          </div>
        )}

        {/* Layer 3 — ambient protection network */}
        <ProtectionNetwork />

        {/* Layer 2 — the dominant floating device, shifted left into the scene */}
        <div className="relative z-10 mx-auto w-full max-w-[24rem] py-6 sm:max-w-[34rem] lg:mt-12 lg:max-w-[33rem] lg:-translate-x-10 lg:py-0 xl:max-w-[40rem] xl:-translate-x-16">
          <ProtectionDashboard metrics={metrics} flat={flat} />
        </div>
      </div>
    </MotionConfig>
  );
}
