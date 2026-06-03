"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Fingerprint, Users, Star, Lock, Radar } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NodeDef = { icon: LucideIcon; label: string; x: number; y: number; delay: number };

// Positioned (in %) around the center-right globe zone. Tuned to frame the
// dashboard without crowding it.
const NODES: NodeDef[] = [
  { icon: ShieldCheck, label: "Protection", x: 58, y: 10, delay: 0 },
  { icon: Fingerprint, label: "Identity", x: 90, y: 26, delay: 0.8 },
  { icon: Users, label: "Family", x: 94, y: 62, delay: 1.6 },
  { icon: Star, label: "Reputation", x: 70, y: 86, delay: 0.4 },
  { icon: Lock, label: "Privacy", x: 46, y: 70, delay: 1.2 },
  { icon: Radar, label: "Monitoring", x: 50, y: 38, delay: 2 },
];

// Orbital connection paths between node centres (viewBox 100x100).
const LINKS: [number, number][] = [[0, 5], [5, 4], [4, 2], [2, 1], [1, 0], [5, 1], [0, 4]];

/**
 * Layer 3 — the ambient protection network: softly floating, pulsing nodes
 * (shield / identity / family / reputation / privacy / monitoring) joined by
 * faint orbital connection lines. Decorative only (aria-hidden); reduced motion
 * stills it.
 */
export function ProtectionNetwork() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {/* connection lines */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {LINKS.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
            stroke="#8b5cf6" strokeWidth={0.18} strokeOpacity={0.35} strokeDasharray="1 2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ delay: 0.4 + i * 0.12, duration: 1.2, ease: "easeInOut" }}
          />
        ))}
      </svg>

      {/* floating nodes */}
      {NODES.map((n) => (
        <motion.div
          key={n.label}
          className="absolute hidden -translate-x-1/2 -translate-y-1/2 lg:block"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { delay: 0.6 + n.delay * 0.2, duration: 0.6 },
            scale: { delay: 0.6 + n.delay * 0.2, duration: 0.6 },
            y: { duration: 5 + n.delay, repeat: Infinity, ease: "easeInOut", delay: n.delay },
          }}
        >
          <span className="relative grid h-10 w-10 place-items-center rounded-2xl border border-violet-400/20 bg-bg-elevated/70 text-violet-200 shadow-lg shadow-brand/20 backdrop-blur">
            <span className="absolute inset-0 animate-pulse-glow rounded-2xl bg-brand/10" />
            <n.icon className="relative h-4 w-4" />
          </span>
        </motion.div>
      ))}
    </div>
  );
}
