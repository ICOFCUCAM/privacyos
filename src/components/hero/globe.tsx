"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { feature } from "topojson-client";
// World geography as DATA (not a displayed texture) → procedural dot Earth.
// `countries` is a GeometryCollection, so feature() yields a FeatureCollection
// with .features (land is a single MultiPolygon → no .features → black globe).
import countriesTopo from "world-atlas/countries-110m.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
const landData = feature(countriesTopo as any, (countriesTopo as any).objects.countries) as any;

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
// Larger metros get scanning-wave rings (Layer 7).
const majorPoints = (["ny", "lon", "dxb", "sin", "tok", "lag", "sao", "syd"] as (keyof typeof HUBS)[])
  .map((k) => ({ lat: HUBS[k][0], lng: HUBS[k][1] }));

function buildGlobe(quality: "high" | "med"): ThreeGlobe {
  const g = new ThreeGlobe({ animateIn: false })
    .globeMaterial(new THREE.MeshPhongMaterial({ color: new THREE.Color("#0a0d1c"), transparent: true, opacity: 0.96, shininess: 5 }))
    .showAtmosphere(true)
    .atmosphereColor("#6f6ad6")
    .atmosphereAltitude(0.16)
    // continents as illuminated dots
    .hexPolygonsData(landData.features)
    .hexPolygonResolution(quality === "med" ? 2 : 3)
    .hexPolygonMargin(0.2)
    .hexPolygonUseDots(true)
    .hexPolygonColor(() => "#8b93f5")
    // intercontinental flowing routes
    .arcsData(arcs)
    .arcColor(() => ["rgba(165,180,252,0)", "rgba(214,222,255,0.95)", "rgba(165,180,252,0)"])
    .arcDashLength(0.45)
    .arcDashGap(1.4)
    .arcDashInitialGap(() => Math.random() * 2)
    .arcDashAnimateTime(3000)
    .arcStroke(0.26)
    .arcAltitudeAutoScale(0.16)
    // city-light clusters (Layer 2)
    .pointsData(points)
    .pointColor(() => "#dbe3ff")
    .pointAltitude(0.008)
    .pointRadius(0.34)
    .pointsMerge(true)
    // scanning-wave pulses over major metros (Layer 7)
    .ringsData(majorPoints)
    .ringColor(() => (t: number) => `rgba(199,210,254,${Math.sqrt(1 - t) * 0.45})`)
    .ringMaxRadius(4.5)
    .ringPropagationSpeed(1.3)
    .ringRepeatPeriod(2400);

  g.rotation.set(0.34, -0.55, 0.06);
  g.scale.setScalar(0.0118);
  return g;
}

/** Layer 4 — slow, softly-glowing orbital intelligence rings. */
function OrbitRings({ reduced }: { reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, d) => { if (!reduced && g.current) g.current.rotation.y += d * 0.02; });
  const rings = [
    { r: 1.36, tilt: 1.1, color: "#818cf8", op: 0.16 },
    { r: 1.46, tilt: -0.75, color: "#6366f1", op: 0.13 },
    { r: 1.3, tilt: 0.45, color: "#a5b4fc", op: 0.11 },
  ];
  return (
    <group ref={g} rotation={[0.3, 0, 0.08]}>
      {rings.map((ring, i) => (
        <mesh key={i} rotation={[ring.tilt, i * 0.7, 0]}>
          <torusGeometry args={[ring.r, 0.0035, 8, 140]} />
          <meshBasicMaterial color={ring.color} transparent opacity={ring.op} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
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
      <OrbitRings reduced={reduced} />
    </Canvas>
  );
}
