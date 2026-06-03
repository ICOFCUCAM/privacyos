"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui";

/**
 * Dependency-free scroll reveal — fades + slides content up the first time it
 * enters the viewport (IntersectionObserver). Respects reduced motion and
 * degrades to visible when IO is unavailable (SSR/old browsers).
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:!transition-none motion-reduce:!opacity-100 motion-reduce:!translate-y-0",
        shown ? "opacity-100 translate-y-0" : "translate-y-8 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Count-up number that animates from 0 → `to` when scrolled into view.
 * Dependency-free (requestAnimationFrame); reduced-motion shows the final value.
 */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  durationMs = 1400,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setValue(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          setValue(Math.round(to * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}
