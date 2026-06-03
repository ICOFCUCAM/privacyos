"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── geography as data (no images/textures) ──────────────────────────────────
 * Continents are approximated by overlapping [lat, lng, angularRadius°] blobs.
 * A lat/long grid point is "land" if it falls inside any blob — so the dot
 * globe reads as Earth (right positions + footprints) while staying 100%
 * procedural points. */
const LAND: [number, number, number][] = [
  // North America
  [60, -150, 8], [64, -112, 13], [55, -100, 13], [50, -118, 9], [45, -92, 12], [40, -100, 12],
  [36, -112, 10], [33, -95, 10], [30, -84, 8], [45, -73, 9], [52, -70, 10], [62, -95, 12],
  [70, -90, 9], [25, -101, 8], [18, -92, 6], [72, -40, 11], [76, -42, 9],
  // South America
  [6, -64, 8], [-2, -60, 11], [-10, -55, 11], [-18, -58, 11], [-28, -60, 9], [-38, -65, 8],
  [-46, -71, 6], [-10, -76, 7], [2, -72, 7],
  // Europe
  [48, 9, 7], [52, 19, 7], [44, 3, 6], [40, -4, 6], [58, 15, 8], [62, 26, 8], [47, 30, 7], [55, 40, 7],
  // Africa
  [30, 20, 8], [26, 6, 9], [18, 14, 10], [9, 19, 10], [1, 23, 10], [-8, 25, 10], [-18, 27, 9],
  [-28, 24, 8], [-33, 22, 5], [8, 39, 7], [1, 41, 6], [14, 42, 5],
  // Asia
  [56, 60, 12], [60, 92, 13], [62, 112, 13], [55, 132, 11], [48, 92, 12], [42, 76, 11], [40, 112, 12],
  [35, 100, 12], [30, 82, 11], [25, 46, 9], [28, 56, 8], [22, 79, 11], [15, 101, 9], [36, 128, 7],
  [39, 141, 6], [46, 132, 9], [10, 107, 6], [0, 114, 6], [62, 152, 10],
  // Australia
  [-25, 134, 12], [-31, 146, 8], [-22, 121, 10], [-35, 149, 5],
];

const HUBS: Record<string, [number, number]> = {
  ny: [40.7, -74], la: [34, -118], sao: [-23.5, -46.6], lon: [51.5, -0.1], mos: [55.7, 37.6],
  lag: [6.5, 3.4], nai: [-1.3, 36.8], dxb: [25, 55], mum: [19, 72.8], sin: [1.3, 103.8],
  tok: [35.7, 139.7], syd: [-33.9, 151],
};
const ROUTES: [keyof typeof HUBS, keyof typeof HUBS][] = [
  ["ny", "lon"], ["lon", "lag"], ["lag", "dxb"], ["dxb", "sin"], ["sin", "tok"], ["ny", "sao"],
  ["lon", "mos"], ["dxb", "mum"], ["mum", "sin"], ["tok", "syd"], ["la", "tok"], ["nai", "dxb"], ["la", "ny"],
];

function toVec3(lat: number, lng: number, r = 1): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}
function angDist(la1: number, lo1: number, la2: number, lo2: number): number {
  const d2r = Math.PI / 180;
  const dLat = (la2 - la1) * d2r, dLon = (lo2 - lo1) * d2r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * d2r) * Math.cos(la2 * d2r) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * (180 / Math.PI);
}
function isLand(lat: number, lng: number): boolean {
  for (const [bl, bo, br] of LAND) if (angDist(lat, lng, bl, bo) < br) return true;
  return false;
}

function GlobeScene({ step, reduced }: { step: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const orbitGroup = useRef<THREE.Group>(null);
  const trafficRef = useRef<THREE.BufferAttribute>(null);

  const data = useMemo(() => {
    const land: number[] = [];
    const ocean: number[] = [];
    let oc = 0;
    for (let lat = -82; lat <= 82; lat += step) {
      for (let lng = -180; lng < 180; lng += step) {
        const v = toVec3(lat, lng, 1);
        if (isLand(lat, lng)) {
          land.push(v.x, v.y, v.z);
        } else if (oc++ % 3 === 0) {
          ocean.push(v.x, v.y, v.z); // faint ocean grid → no empty black
        }
      }
    }

    // Intercontinental routes (great-circle bezier arcs) + travelling signals.
    const segs: number[] = [];
    const curves: THREE.QuadraticBezierCurve3[] = [];
    for (const [a, b] of ROUTES) {
      const va = toVec3(HUBS[a][0], HUBS[a][1], 1);
      const vb = toVec3(HUBS[b][0], HUBS[b][1], 1);
      const mid = va.clone().add(vb).multiplyScalar(0.5).normalize().multiplyScalar(1 + va.distanceTo(vb) * 0.42);
      const curve = new THREE.QuadraticBezierCurve3(va, mid, vb);
      curves.push(curve);
      const pts = curve.getPoints(30);
      for (let s = 0; s < pts.length - 1; s++) segs.push(pts[s].x, pts[s].y, pts[s].z, pts[s + 1].x, pts[s + 1].y, pts[s + 1].z);
    }

    return {
      land: new Float32Array(land),
      ocean: new Float32Array(ocean),
      segs: new Float32Array(segs),
      curves,
      traffic: new Float32Array(curves.length * 3),
    };
  }, [step]);

  const orbits = useMemo(() => [
    { r: 1.4, tilt: 0.4, speed: 0.14, phase: 0 },
    { r: 1.5, tilt: -0.6, speed: -0.1, phase: 2.2 },
    { r: 1.34, tilt: 1.0, speed: 0.08, phase: 4.1 },
  ], []);

  useFrame((state, delta) => {
    if (reduced) return;
    if (group.current) group.current.rotation.y += delta * 0.035;
    const t = state.clock.elapsedTime;
    if (trafficRef.current) {
      const arr = trafficRef.current.array as Float32Array;
      data.curves.forEach((c, i) => {
        const u = ((t * 0.14 + i * 0.23) % 1 + 1) % 1;
        const p = c.getPoint(u);
        arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
      });
      trafficRef.current.needsUpdate = true;
    }
    if (orbitGroup.current) orbitGroup.current.children.forEach((ch, i) => {
      const o = orbits[i]; const a = t * o.speed + o.phase;
      ch.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r * Math.sin(o.tilt), Math.sin(a) * o.r * Math.cos(o.tilt));
    });
  });

  return (
    <group ref={group} rotation={[0.34, -0.5, 0.08]}>
      {/* core sphere — deep navy */}
      <mesh><sphereGeometry args={[0.985, 64, 64]} /><meshBasicMaterial color="#060812" /></mesh>

      {/* ocean grid (faint depth layer) */}
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.ocean, 3]} /></bufferGeometry>
        <pointsMaterial color="#232a52" size={0.0085} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
      </points>

      {/* continents (bright indigo land dots) */}
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.land, 3]} /></bufferGeometry>
        <pointsMaterial color="#9aa6fb" size={0.016} sizeAttenuation transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* intercontinental routes */}
      {data.segs.length > 0 && (
        <lineSegments>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.segs, 3]} /></bufferGeometry>
          <lineBasicMaterial color="#6366f1" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
        </lineSegments>
      )}

      {/* flowing protection signals */}
      <points>
        <bufferGeometry><bufferAttribute ref={trafficRef} attach="attributes-position" args={[data.traffic, 3]} /></bufferGeometry>
        <pointsMaterial color="#dbe3ff" size={0.05} sizeAttenuation transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* atmosphere rim lighting (soft purple) */}
      <mesh scale={1.13}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial transparent side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false}
          vertexShader={`varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`varying vec3 vN; void main(){ float i = pow(0.6 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.34,0.30,0.66,1.0) * clamp(i,0.0,0.6); }`}
        />
      </mesh>

      {/* orbit layer */}
      <group ref={orbitGroup}>
        {orbits.map((_, i) => (
          <mesh key={i}><sphereGeometry args={[0.026, 16, 16]} /><meshBasicMaterial color="#c7d2fe" /></mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Layer 1 — the digital Earth: a procedural dot-globe whose land dots trace the
 * real continents, with faint ocean grid, intercontinental routes, flowing
 * signals, orbit layer and atmospheric rim glow. Lazy + client-only; reduced
 * motion freezes it; grid step coarsens on smaller screens (LOD).
 */
export default function Globe({ quality = "high", reduced = false }: { quality?: "high" | "med"; reduced?: boolean }) {
  const step = quality === "med" ? 3.4 : 2.4;
  return (
    <Canvas
      dpr={[1, 1.7]}
      camera={{ position: [0, 0, 2.9], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      frameloop={reduced ? "demand" : "always"}
    >
      <ambientLight intensity={0.5} />
      <GlobeScene step={step} reduced={reduced} />
    </Canvas>
  );
}
