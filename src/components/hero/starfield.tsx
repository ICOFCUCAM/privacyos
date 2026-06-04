import { cn } from "@/lib/ui";

/**
 * Hero starfield — the backmost depth layer. A deterministic field of faint dots
 * (computed once at module load, so server and client render identically — no
 * hydration mismatch), a subset gently twinkling. Decorative + reduced-motion
 * safe. Sits behind the globe/network/device to give the hero real depth.
 */
const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 61 + 7) % 100,
  y: (i * 37 + 13) % 100,
  size: 0.8 + (i % 3) * 0.7,
  opacity: 0.18 + (i % 5) * 0.07,
  twinkle: i % 3 === 0,
  delay: (i % 7) * 0.6,
}));

export function HeroStarfield() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STARS.map((s, i) => (
        <span
          key={i}
          className={cn("absolute rounded-full bg-white", s.twinkle && "hero-star")}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
