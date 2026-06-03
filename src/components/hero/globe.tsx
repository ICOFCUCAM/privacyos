"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── geometry helpers ─────────────────────────────────────────────────────── */

/** N points evenly spread on a unit sphere (Fibonacci spiral). */
function fibonacciSphere(n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  return pts;
}

function ParticleGlobe({ count, reduced }: { count: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const nodes = useRef<THREE.Group>(null);

  const { positions, lines } = useMemo(() => {
    const pts = fibonacciSphere(count);
    const positions = new Float32Array(count * 3);
    pts.forEach((p, i) => { positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z; });

    // Curated connection lines: link each point to a near neighbour, capped.
    const seg: number[] = [];
    const maxLines = Math.min(260, Math.floor(count * 0.4));
    const threshold = 0.22;
    for (let i = 0; i < pts.length && seg.length < maxLines * 6; i += 2) {
      for (let j = i + 1; j < Math.min(i + 14, pts.length); j++) {
        if (pts[i].distanceTo(pts[j]) < threshold) {
          seg.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
          break;
        }
      }
    }
    return { positions, lines: new Float32Array(seg) };
  }, [count]);

  // 3 orbiting protection nodes on tilted rings.
  const orbits = useMemo(
    () => [
      { r: 1.34, tilt: 0.35, speed: 0.18, phase: 0 },
      { r: 1.42, tilt: -0.55, speed: -0.13, phase: 2.1 },
      { r: 1.3, tilt: 0.9, speed: 0.1, phase: 4.0 },
    ],
    [],
  );

  useFrame((state, delta) => {
    if (reduced) return;
    if (group.current) group.current.rotation.y += delta * 0.045;
    if (nodes.current) {
      const t = state.clock.elapsedTime;
      nodes.current.children.forEach((child, i) => {
        const o = orbits[i];
        const a = t * o.speed + o.phase;
        child.position.set(
          Math.cos(a) * o.r,
          Math.sin(a) * o.r * Math.sin(o.tilt),
          Math.sin(a) * o.r * Math.cos(o.tilt),
        );
      });
    }
  });

  return (
    <group ref={group} rotation={[0.35, 0, 0.12]}>
      {/* core sphere (very dark) */}
      <mesh>
        <sphereGeometry args={[0.97, 48, 48]} />
        <meshBasicMaterial color="#0a0a16" transparent opacity={0.92} />
      </mesh>

      {/* particle network (glowing violet) */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#b9a4fb" size={0.026} sizeAttenuation transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* connection lines */}
      {lines.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[lines, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#7c3aed" transparent opacity={0.36} depthWrite={false} blending={THREE.AdditiveBlending} />
        </lineSegments>
      )}

      {/* atmosphere fresnel glow */}
      <mesh scale={1.16}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexShader={`varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.49,0.33,0.93,1.0) * clamp(i,0.0,1.0); }`}
        />
      </mesh>

      {/* orbiting protection nodes */}
      <group ref={nodes}>
        {orbits.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshBasicMaterial color="#c4b5fd" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Layer 1 — the digital protection globe. Dark sphere, violet particle network,
 * connection lines, atmospheric glow and orbiting nodes, rotating slowly. Lazy-
 * loaded + client-only; honors reduced motion; particle count scales down on
 * smaller screens.
 */
export default function Globe({ count = 720, reduced = false }: { count?: number; reduced?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 3.1], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      frameloop={reduced ? "demand" : "always"}
    >
      <ambientLight intensity={0.6} />
      <ParticleGlobe count={count} reduced={reduced} />
    </Canvas>
  );
}
