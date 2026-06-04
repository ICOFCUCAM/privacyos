"use client";

import { useEffect, useRef } from "react";
import { LAND_DOTS, CITY_DOTS } from "./globe-dots";

/* ── Precompute geo points once (module scope) — never recomputed at runtime ─ */
const DEG = Math.PI / 180;
type Geo = { lat: number; lng: number };
const LAND: Geo[] = [];
for (let i = 0; i < LAND_DOTS.length; i += 2) LAND.push({ lat: LAND_DOTS[i], lng: LAND_DOTS[i + 1] });
const CITIES: Geo[] = CITY_DOTS.map(([lat, lng]) => ({ lat, lng }));

// Intercontinental arc routes (indices into CITIES) — purposeful, not random.
const ROUTES: [number, number][] = [
  [0, 5], [5, 11], [11, 15], [15, 18], [18, 19], [0, 3],
  [5, 9], [16, 17], [17, 18], [19, 25], [1, 19], [14, 15],
];
const PULSE_HUBS = [0, 5, 19, 16]; // NY, London, Tokyo, Mumbai

const AXIS = -0.34; // axial tilt (radians) for a natural lean
const sinT = Math.sin(AXIS);
const cosT = Math.cos(AXIS);

/** Project a lat/lng (with current rotation) to screen space + visibility. */
function project(lat: number, lng: number, rot: number, cx: number, cy: number, R: number, lift = 0) {
  const la = lat * DEG;
  const lo = (lng + rot) * DEG;
  const cphi = Math.cos(la);
  const x0 = cphi * Math.sin(lo);
  const y0 = Math.sin(la);
  const z0 = cphi * Math.cos(lo);
  // tilt about the X axis
  const y = y0 * cosT - z0 * sinT;
  const z = y0 * sinT + z0 * cosT;
  const r = R * (1 + lift);
  return { x: cx + x0 * r, y: cy - y * r, z };
}

type Mode = { reduced: boolean; quality: "high" | "med" };

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, rot: number, time: number, q: "high" | "med") {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.46;
  ctx.clearRect(0, 0, w, h);

  // Sphere body — lit from the upper-left for depth.
  const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  body.addColorStop(0, "#141c44");
  body.addColorStop(0.55, "#0b1030");
  body.addColorStop(1, "#05070f");
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  // Atmosphere rim.
  const atmo = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.14);
  atmo.addColorStop(0, "rgba(111,106,214,0)");
  atmo.addColorStop(0.7, "rgba(111,106,214,0.14)");
  atmo.addColorStop(1, "rgba(111,106,214,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.14, 0, Math.PI * 2);
  ctx.fillStyle = atmo;
  ctx.fill();

  // Land dots (precomputed) — LOD via stride; limb-fade via depth.
  const stride = q === "med" || w < 440 ? 2 : 1;
  const dotR = R * 0.0125;
  ctx.fillStyle = "#7c87e8";
  for (let i = 0; i < LAND.length; i += stride) {
    const d = LAND[i];
    const p = project(d.lat, d.lng, rot, cx, cy, R);
    if (p.z <= 0.02) continue;
    ctx.globalAlpha = 0.16 + 0.7 * p.z;
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotR * (0.55 + 0.45 * p.z), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // City lights — brighter cores with a soft glow.
  for (const c of CITIES) {
    const p = project(c.lat, c.lng, rot, cx, cy, R);
    if (p.z <= 0.04) continue;
    const a = 0.35 + 0.65 * p.z;
    ctx.shadowColor = "rgba(199,210,254,0.9)";
    ctx.shadowBlur = 8 * p.z;
    ctx.fillStyle = `rgba(238,242,255,${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotR * 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Arcs — great-circle-ish routes with a travelling signal.
  const segs = q === "med" ? 18 : 26;
  for (let ri = 0; ri < ROUTES.length; ri++) {
    const a = CITIES[ROUTES[ri][0]];
    const b = CITIES[ROUTES[ri][1]];
    ctx.beginPath();
    let drawing = false;
    for (let s = 0; s <= segs; s++) {
      const f = s / segs;
      const lat = a.lat + (b.lat - a.lat) * f;
      const lng = a.lng + (b.lng - a.lng) * f;
      const lift = 0.18 * Math.sin(Math.PI * f);
      const p = project(lat, lng, rot, cx, cy, R, lift);
      if (p.z <= 0) { drawing = false; continue; }
      if (!drawing) { ctx.moveTo(p.x, p.y); drawing = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(165,180,252,0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // travelling signal dot
    const head = (time * 0.18 + ri * 0.37) % 1;
    const lat = a.lat + (b.lat - a.lat) * head;
    const lng = a.lng + (b.lng - a.lng) * head;
    const lift = 0.18 * Math.sin(Math.PI * head);
    const ph = project(lat, lng, rot, cx, cy, R, lift);
    if (ph.z > 0) {
      ctx.shadowColor = "rgba(214,222,255,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(224,231,255,0.95)";
      ctx.beginPath();
      ctx.arc(ph.x, ph.y, dotR * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Scan pulses over major hubs.
  for (let i = 0; i < PULSE_HUBS.length; i++) {
    const c = CITIES[PULSE_HUBS[i]];
    const p = project(c.lat, c.lng, rot, cx, cy, R);
    if (p.z <= 0.06) continue;
    const phase = (time * 0.4 + i * 0.25) % 1;
    const rad = R * 0.13 * phase;
    ctx.globalAlpha = (1 - phase) * 0.5 * p.z;
    ctx.strokeStyle = "rgba(199,210,254,1)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * The hero digital Earth — a precomputed dot-globe rendered on a 2D canvas.
 *
 * Replaces the former WebGL (three.js / three-globe) implementation: no 3D
 * dependencies, no runtime topojson parse/triangulation, a single
 * requestAnimationFrame loop that PAUSES when scrolled offscreen or when the
 * tab is hidden, LOD + DPR scaling per quality, and a static frame under
 * reduced-motion. Decorative only (aria-hidden).
 */
export default function Globe({ quality = "high", reduced = false }: Partial<Mode>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dprCap = quality === "med" ? 1.25 : 1.5;
    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let rot = -20;
    let raf = 0;
    let last = 0;
    let running = false;

    const frame = (now: number) => {
      if (!running) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      rot += dt * 3.2; // deg/sec — calm rotation
      paint(ctx, w, h, rot, now / 1000, quality);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    if (reduced) {
      // Static premium frame — no animation loop at all.
      paint(ctx, w, h, rot, 0, quality);
      return () => ro.disconnect();
    }

    // Only animate while the hero is actually on screen.
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
      { threshold: 0.05 },
    );
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [quality, reduced]);

  return <canvas ref={canvasRef} aria-hidden className="h-full w-full" />;
}
