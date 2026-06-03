"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { feature } from "topojson-client";
// Higher-resolution country geometry as DATA (not a texture) → real coastlines.
import countriesTopo from "world-atlas/countries-50m.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
const landData = feature(countriesTopo as any, (countriesTopo as any).objects.countries) as any;

const HUBS: Record<string, [number, number]> = {
  ny: [40.7, -74], la: [34, -118], sao: [-23.5, -46.6], lon: [51.5, -0.1], mos: [55.7, 37.6],
  lag: [6.5, 3.4], nai: [-1.3, 36.8], dxb: [25, 55], mum: [19, 72.8], sin: [1.3, 103.8], tok: [35.7, 139.7], syd: [-33.9, 151],
};
// Intercontinental routes — purposeful coverage, not random lines.
const ROUTE_KEYS: [keyof typeof HUBS, keyof typeof HUBS][] = [
  ["ny", "lon"], ["lon", "lag"], ["lag", "dxb"], ["dxb", "sin"], ["sin", "tok"], ["ny", "sao"],
  ["lon", "mos"], ["dxb", "mum"], ["mum", "sin"], ["tok", "syd"], ["la", "tok"], ["nai", "dxb"], ["la", "ny"], ["mos", "tok"],
];
const arcs = ROUTE_KEYS.map(([a, b]) => ({ startLat: HUBS[a][0], startLng: HUBS[a][1], endLat: HUBS[b][0], endLng: HUBS[b][1] }));

// Dense city-lights layer (NASA night-earth feel): [lat, lng, brightness].
const CITIES: [number, number, number][] = [
  [40.7, -74, 0.6], [34, -118, 0.5], [41.9, -87.6, 0.4], [43.7, -79.4, 0.4], [19.4, -99.1, 0.5], [25.8, -80.2, 0.35], [29.8, -95.4, 0.35],
  [-23.5, -46.6, 0.5], [-34.6, -58.4, 0.45], [-22.9, -43.2, 0.35], [4.7, -74, 0.35], [-12, -77, 0.3],
  [51.5, -0.1, 0.55], [48.9, 2.35, 0.5], [40.4, -3.7, 0.4], [52.5, 13.4, 0.4], [55.7, 37.6, 0.45], [41.9, 12.5, 0.35], [41, 28.9, 0.45], [52.2, 21, 0.3],
  [6.5, 3.4, 0.5], [30, 31.2, 0.45], [-26.2, 28, 0.4], [-1.3, 36.8, 0.35], [33.6, -7.6, 0.3], [9, 7.4, 0.3],
  [25, 55, 0.45], [19, 72.8, 0.55], [28.6, 77.2, 0.55], [1.3, 103.8, 0.5], [35.7, 139.7, 0.6], [31.2, 121.5, 0.55], [39.9, 116.4, 0.5],
  [37.6, 127, 0.45], [13.7, 100.5, 0.4], [-6.2, 106.8, 0.45], [22.3, 114.2, 0.45], [24.7, 46.7, 0.35], [14.6, 121, 0.4],
  [-33.9, 151, 0.45], [-37.8, 145, 0.35],
];
const cities = CITIES; // base metros (drives routes/rings)
const ringPoints = CITIES.filter(([, , s]) => s >= 0.5).map(([lat, lng]) => ({ lat, lng }));

// Clustered city-light field: each metro + jittered satellites (metro sprawl),
// so populated regions glow with density — NASA night-earth, not a GIS map.
type Light = { lat: number; lng: number; size: number; core: boolean };
const lights: Light[] = [];
for (const [lat, lng, size] of cities) {
  lights.push({ lat, lng, size, core: true });
  const sats = Math.round(size * 7);
  for (let i = 0; i < sats; i++) {
    const a = (i / sats) * Math.PI * 2;
    const rad = size * (1.6 + (i % 3) * 0.9);
    lights.push({ lat: lat + Math.sin(a) * rad * 0.6, lng: lng + Math.cos(a) * rad, size: size * 0.4, core: false });
  }
}

function buildGlobe(quality: "high" | "med"): ThreeGlobe {
  const g = new ThreeGlobe({ animateIn: false })
    .globeMaterial(new THREE.MeshPhongMaterial({ color: new THREE.Color("#070a16"), transparent: true, opacity: 0.98, shininess: 8 }))
    .showAtmosphere(true)
    .atmosphereColor("#6f6ad6")
    .atmosphereAltitude(0.19)
    // Continents: dark, subtle landmasses — perceptible but not a bright map.
    .polygonsData(landData.features)
    .polygonCapColor(() => "rgba(54,62,138,0.16)")
    .polygonSideColor(() => "rgba(40,46,110,0.05)")
    .polygonStrokeColor(() => "rgba(116,128,220,0.14)")
    .polygonAltitude(() => 0.006)
    // Intercontinental routes with flowing signals.
    .arcsData(arcs)
    .arcColor(() => ["rgba(165,180,252,0)", "rgba(214,222,255,0.95)", "rgba(165,180,252,0)"])
    .arcDashLength(0.45).arcDashGap(1.4).arcDashInitialGap(() => Math.random() * 2).arcDashAnimateTime(3000)
    .arcStroke(0.26).arcAltitudeAutoScale(0.16)
    // City lights — bright metro cores + dim sprawl (clustered density).
    .pointsData(lights)
    .pointColor((d: any) => (d.core ? "#eef2ff" : "#8f9cf2"))
    .pointAltitude((d: any) => (d.core ? 0.012 : 0.006))
    .pointRadius((d: any) => (d.core ? 0.16 + d.size * 0.5 : 0.07 + d.size * 0.25))
    // Scanning-wave pulses over the largest metros.
    .ringsData(ringPoints)
    .ringColor(() => (t: number) => `rgba(199,210,254,${Math.sqrt(1 - t) * 0.4})`)
    .ringMaxRadius(4.5).ringPropagationSpeed(1.3).ringRepeatPeriod(2600);

  if (quality === "med") g.pointsMerge(true);
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
    { r: 1.3, tilt: 0.45, color: "#a5b4fc", op: 0.1 },
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
  useFrame((_, delta) => { if (!reduced) globe.rotation.y += delta * 0.028; });
  return <primitive object={globe} />;
}

/**
 * Layer 1 — the digital Earth. Solid, illuminated continents with real
 * coastlines (50m country geometry as data, not a texture), a dense city-lights
 * layer (NASA night-earth feel), intercontinental routes + flowing signals,
 * orbital rings, scan pulses and atmospheric rim glow. Lazy + client-only;
 * reduced motion freezes; resolution eases on tablet.
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
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 1.5, 2.5]} intensity={1.3} color="#cdd2ff" />
      <GlobeObject quality={quality} reduced={reduced} />
      <OrbitRings reduced={reduced} />
    </Canvas>
  );
}
