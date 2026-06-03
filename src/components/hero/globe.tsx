"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── helpers ──────────────────────────────────────────────────────────────── */

function fibonacciSphere(n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = phi * i;
    pts.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
  }
  return pts;
}

/** Cheap blobby "value noise" — used to carve continent-like land masses. */
function landNoise(p: THREE.Vector3): number {
  let n = 0;
  n += Math.sin(p.x * 1.7 + 1.1) * Math.cos(p.y * 2.1 - 0.6);
  n += Math.sin(p.y * 2.6 + 2.0) * Math.cos(p.z * 1.6 + 0.5);
  n += Math.sin(p.z * 1.3 - 1.4) * Math.cos(p.x * 2.9 + 1.2);
  n += 0.5 * Math.sin(p.x * 4.3 + p.z * 3.1);
  return n / 3.5; // ~ -1..1
}

function GlobeScene({ count, reduced }: { count: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const orbitGroup = useRef<THREE.Group>(null);
  const trafficRef = useRef<THREE.BufferAttribute>(null);

  const data = useMemo(() => {
    const all = fibonacciSphere(count);
    const land: number[] = [];
    const ocean: number[] = [];
    const landPts: THREE.Vector3[] = [];
    all.forEach((p, i) => {
      const isLand = landNoise(p) > 0.12;
      if (isLand) {
        land.push(p.x, p.y, p.z);
        landPts.push(p);
      } else if (i % 3 === 0) {
        // sparse, faint ocean grid for depth
        ocean.push(p.x, p.y, p.z);
      }
    });

    // Connection arcs between distant land points + their travelling signals.
    const curves: THREE.QuadraticBezierCurve3[] = [];
    const segs: number[] = [];
    const arcCount = Math.min(12, Math.floor(landPts.length / 14));
    for (let k = 0; k < arcCount; k++) {
      const a = landPts[(k * 53) % landPts.length];
      const b = landPts[(k * 97 + 17) % landPts.length];
      if (a.distanceTo(b) < 0.8) continue;
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(1 + a.distanceTo(b) * 0.45);
      const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
      curves.push(curve);
      const pts = curve.getPoints(26);
      for (let s = 0; s < pts.length - 1; s++) {
        segs.push(pts[s].x, pts[s].y, pts[s].z, pts[s + 1].x, pts[s + 1].y, pts[s + 1].z);
      }
    }

    return {
      land: new Float32Array(land),
      ocean: new Float32Array(ocean),
      segs: new Float32Array(segs),
      curves,
      traffic: new Float32Array(curves.length * 3),
    };
  }, [count]);

  const orbits = useMemo(
    () => [
      { r: 1.36, tilt: 0.4, speed: 0.16, phase: 0 },
      { r: 1.46, tilt: -0.6, speed: -0.11, phase: 2.2 },
      { r: 1.3, tilt: 1.0, speed: 0.09, phase: 4.1 },
    ],
    [],
  );

  useFrame((state, delta) => {
    if (reduced) return;
    if (group.current) group.current.rotation.y += delta * 0.04;

    const t = state.clock.elapsedTime;
    // flowing traffic — move a signal along each arc
    if (trafficRef.current) {
      const arr = trafficRef.current.array as Float32Array;
      data.curves.forEach((c, i) => {
        const u = ((t * 0.16 + i * 0.27) % 1 + 1) % 1;
        const p = c.getPoint(u);
        arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
      });
      trafficRef.current.needsUpdate = true;
    }
    if (orbitGroup.current) {
      orbitGroup.current.children.forEach((child, i) => {
        const o = orbits[i];
        const a = t * o.speed + o.phase;
        child.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r * Math.sin(o.tilt), Math.sin(a) * o.r * Math.cos(o.tilt));
      });
    }
  });

  return (
    <group ref={group} rotation={[0.32, 0, 0.1]}>
      {/* core sphere — deep navy, gives the dot-globe its solidity + depth */}
      <mesh>
        <sphereGeometry args={[0.985, 64, 64]} />
        <meshBasicMaterial color="#070912" />
      </mesh>

      {/* faint ocean grid (depth layer) */}
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.ocean, 3]} /></bufferGeometry>
        <pointsMaterial color="#2a2f55" size={0.012} sizeAttenuation transparent opacity={0.5} depthWrite={false} />
      </points>

      {/* continents (brighter indigo, denser) */}
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.land, 3]} /></bufferGeometry>
        <pointsMaterial color="#8b93f5" size={0.02} sizeAttenuation transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* connection paths */}
      {data.segs.length > 0 && (
        <lineSegments>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.segs, 3]} /></bufferGeometry>
          <lineBasicMaterial color="#4f46e5" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
        </lineSegments>
      )}

      {/* flowing traffic signals */}
      <points>
        <bufferGeometry><bufferAttribute ref={trafficRef} attach="attributes-position" args={[data.traffic, 3]} /></bufferGeometry>
        <pointsMaterial color="#c7d2fe" size={0.05} sizeAttenuation transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* atmosphere fresnel glow — toned down, navy-indigo */}
      <mesh scale={1.14}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial
          transparent side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false}
          vertexShader={`varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`varying vec3 vN; void main(){ float i = pow(0.58 - dot(vN, vec3(0.0,0.0,1.0)), 3.2); gl_FragColor = vec4(0.30,0.27,0.62,1.0) * clamp(i,0.0,0.55); }`}
        />
      </mesh>

      {/* orbiting protection signals */}
      <group ref={orbitGroup}>
        {orbits.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.028, 16, 16]} />
            <meshBasicMaterial color="#c7d2fe" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Layer 1 — the digital protection globe: deep-navy sphere with continent
 * particle masses, connection paths, flowing traffic signals, atmospheric glow
 * and orbiting nodes. Lazy + client-only; reduced-motion freezes it; particle
 * count scales down on smaller screens.
 */
export default function Globe({ count = 2200, reduced = false }: { count?: number; reduced?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 3.0], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      frameloop={reduced ? "demand" : "always"}
    >
      <ambientLight intensity={0.55} />
      <GlobeScene count={count} reduced={reduced} />
    </Canvas>
  );
}
