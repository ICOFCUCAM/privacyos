"use client";

import { useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { feature } from "topojson-client";
// World land geometry as DATA (not a displayed texture) → procedural dot Earth.
import landTopo from "world-atlas/land-110m.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
const landData = feature(landTopo as any, (landTopo as any).objects.land) as any;

const HUBS: Record<string, [number, number]> = {
  ny: [40.7, -74], la: [34, -118], sao: [-23.5, -46.6], lon: [51.5, -0.1], mos: [55.7, 37.6],
  lag: [6.5, 3.4], nai: [-1.3, 36.8], dxb: [25, 55], mum: [19, 72.8], sin: [1.3, 103.8], tok: [35.7, 139.7], syd: [-33.9, 151],
};
const ROUTE_KEYS: [keyof typeof HUBS, keyof typeof HUBS][] = [
  ["ny", "lon"], ["lon", "lag"], ["lag", "dxb"], ["dxb", "sin"], ["sin", "tok"], ["ny", "sao"],
  ["lon", "mos"], ["dxb", "mum"], ["mum", "sin"], ["tok", "syd"], ["la", "tok"], ["nai", "dxb"], ["la", "ny"],
];
const arcs = ROUTE_KEYS.map(([a, b]) => ({
  startLat: HUBS[a][0], startLng: HUBS[a][1], endLat: HUBS[b][0], endLng: HUBS[b][1],
}));
const points = Object.values(HUBS).map(([lat, lng]) => ({ lat, lng }));

function buildGlobe(quality: "high" | "med"): ThreeGlobe {
  const g = new ThreeGlobe({ animateIn: false })
    .globeMaterial(new THREE.MeshPhongMaterial({ color: new THREE.Color("#0a0d1c"), transparent: true, opacity: 0.96, shininess: 5 }))
    .showAtmosphere(true)
    .atmosphereColor("#6f6ad6")
    .atmosphereAltitude(0.16)
    // continents as illuminated dots
    .hexPolygonsData(landData.features)
    .hexPolygonResolution(quality === "med" ? 2 : 3)
    .hexPolygonMargin(0.32)
    .hexPolygonUseDots(true)
    .hexPolygonColor(() => "#8b93f5")
    // intercontinental flowing routes
    .arcsData(arcs)
    .arcColor(() => ["rgba(165,180,252,0)", "rgba(214,222,255,0.95)", "rgba(165,180,252,0)"])
    .arcDashLength(0.5)
    .arcDashGap(1.1)
    .arcDashInitialGap(() => Math.random() * 2)
    .arcDashAnimateTime(2800)
    .arcStroke(0.32)
    .arcAltitudeAutoScale(0.45)
    // city-light clusters
    .pointsData(points)
    .pointColor(() => "#dbe3ff")
    .pointAltitude(0.004)
    .pointRadius(0.3)
    .pointsMerge(true);

  g.rotation.set(0.34, -0.55, 0.06);
  g.scale.setScalar(0.0118);
  return g;
}

function GlobeObject({ quality, reduced }: { quality: "high" | "med"; reduced: boolean }) {
  const globe = useMemo(() => buildGlobe(quality), [quality]);
  useFrame((_, delta) => { if (!reduced) globe.rotation.y += delta * 0.03; });
  return <primitive object={globe} />;
}

/**
 * Layer 1 — the digital Earth. Built with three-globe from real world land
 * geometry (data, not a flat texture): illuminated continent dots, soft
 * atmosphere, intercontinental routes with flowing signals, and city-light
 * clusters. Lazy + client-only; reduced motion freezes rotation; resolution
 * drops on tablet (LOD).
 */
export default function Globe({ quality = "high", reduced = false }: { quality?: "high" | "med"; reduced?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.7]}
      camera={{ position: [0, 0, 3], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      frameloop={reduced ? "demand" : "always"}
    >
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 1.5, 2.5]} intensity={1.1} color="#bdbaff" />
      <GlobeObject quality={quality} reduced={reduced} />
    </Canvas>
  );
}
