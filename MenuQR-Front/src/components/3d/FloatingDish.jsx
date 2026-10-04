import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useDishAssets from './useDishAssets';
import { Leaf, Peppercorn, Tomato, TomatoHalf } from './Ingredient';
import { seeded } from './geometry';

// Plated composition in plate space (y up, sauce surface ≈ 0.12).
// `out` is where each element drifts to when the dish is "exploded".
const PLATED = [
  { type: 'tomato', pos: [0.62, 0.26, -0.28], rot: [0.2, 0.4, 0.1], out: [1.1, 1.0, -0.7] },
  { type: 'tomato', pos: [-0.6, 0.26, -0.1], rot: [-0.1, 1.2, 0.2], out: [-1.2, 1.2, -0.2] },
  { type: 'tomato', pos: [0.35, 0.26, 0.6], rot: [0.3, 2, -0.2], out: [0.6, 0.8, 1.1] },
  { type: 'half', pos: [-0.32, 0.25, 0.56], rot: [0.15, 0.3, -0.1], out: [-0.8, 0.7, 1.0] },
  { type: 'half', pos: [0.7, 0.25, 0.2], rot: [-0.1, 1, 0.12], out: [1.3, 0.6, 0.5] },
  { type: 'leaf', pos: [0.28, 0.17, -0.5], rot: [0.1, 0.6, 0.05], out: [0.5, 1.6, -0.9] },
  { type: 'leaf', pos: [-0.5, 0.17, 0.3], rot: [0, 2.3, -0.08], out: [-0.9, 1.4, 0.6] },
  { type: 'leaf', pos: [0.52, 0.17, 0.36], rot: [0.05, -1.1, 0.1], out: [1.0, 1.3, 0.8] },
  { type: 'leaf', pos: [-0.02, 0.6, 0.04], rot: [0.25, 0.4, 0.1], scale: 0.75, out: [0, 2.3, 0.1] },
];

const ORBIT_TYPES = ['tomato', 'leaf', 'pepper', 'half', 'leaf', 'tomato', 'pepper', 'leaf', 'half'];

const INGREDIENTS = { tomato: Tomato, half: TomatoHalf, leaf: Leaf, pepper: Peppercorn };

const BURRATA = { pos: [0.04, 0.33, 0.02], out: [0, 1.45, 0] };

export default function FloatingDish({ settings, motion }) {
  const { geometries: g, materials: m } = useDishAssets(settings);

  const burrata = useRef();
  const plated = useRef([]);
  const orbit = useRef();
  const orbiters = useRef([]);
  const pepperMesh = useRef();
  const herbMesh = useRef();

  const orbitConfig = useMemo(
    () =>
      Array.from({ length: settings.orbiters }, (_, i) => ({
        type: ORBIT_TYPES[i % ORBIT_TYPES.length],
        angle: (i / settings.orbiters) * Math.PI * 2 + 0.4,
        radius: 2.25 + (i % 3) * 0.2,
        y: -0.2 + (i % 4) * 0.3,
        spin: 0.3 + (i % 5) * 0.12,
      })),
    [settings.orbiters]
  );

  // Scatter pepper and herb flecks over the sauce (instanced, deterministic).
  useLayoutEffect(() => {
    const rand = seeded(7);
    const dummy = new THREE.Object3D();
    const place = (mesh, count, size) => {
      if (!mesh) return;
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2;
        const r = 0.35 + Math.sqrt(rand()) * 0.55;
        dummy.position.set(Math.cos(a) * r, 0.135, Math.sin(a) * r);
        dummy.scale.setScalar(size * (0.7 + rand() * 0.6));
        dummy.rotation.set(rand() * 3, rand() * 3, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    const pepperCount = Math.ceil(settings.flecks * 0.6);
    place(pepperMesh.current, pepperCount, 0.022);
    place(herbMesh.current, settings.flecks - pepperCount, 0.018);
  }, [settings.flecks]);

  useFrame((state, delta) => {
    const e = motion.explode;
    const t = state.clock.elapsedTime;
    const still = motion.reduced;
    const ease = e * e * (3 - 2 * e); // smoothstep

    if (burrata.current) {
      burrata.current.position.set(
        BURRATA.pos[0],
        BURRATA.pos[1] + BURRATA.out[1] * ease + (still ? 0 : Math.sin(t * 1.3) * 0.05 * ease),
        BURRATA.pos[2]
      );
      burrata.current.rotation.set(ease * 0.5, ease * 1.4, ease * 0.25);
    }

    plated.current.forEach((obj, i) => {
      if (!obj) return;
      const c = PLATED[i];
      const bob = still ? 0 : Math.sin(t * 1.1 + i * 1.7) * 0.06 * ease;
      obj.position.set(c.pos[0] + c.out[0] * ease, c.pos[1] + c.out[1] * ease + bob, c.pos[2] + c.out[2] * ease);
      const dir = i % 2 ? 1 : -1;
      obj.rotation.set(c.rot[0] + ease * 1.1 * dir, c.rot[1] + ease * 1.8, c.rot[2] + ease * 0.7 * dir);
    });

    if (orbit.current && !still) orbit.current.rotation.y += Math.min(delta, 0.05) * 0.1;
    orbiters.current.forEach((obj, i) => {
      if (!obj) return;
      const c = orbitConfig[i];
      const r = c.radius + ease * 0.35;
      obj.position.set(Math.cos(c.angle) * r, c.y + ease * 0.5 + (still ? 0 : Math.sin(t * 0.8 + i) * 0.08), Math.sin(c.angle) * r);
      if (!still) {
        obj.rotation.x = t * c.spin * 0.6 + i;
        obj.rotation.y = t * c.spin + i;
      }
    });
  });

  const pepperCount = Math.ceil(settings.flecks * 0.6);

  return (
    <group>
      {/* Soft contact shadow */}
      <mesh geometry={g.shadow} material={m.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} scale={4.6} />

      {/* Plate */}
      <mesh geometry={g.plate} material={m.ceramic} />
      <mesh geometry={g.rim} material={m.rim} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.272, 0]} />

      {/* Sauce, oil and seasoning stay on the plate */}
      <mesh geometry={g.sauce} material={m.sauce} position={[0, 0.085, 0]} />
      <mesh geometry={g.drizzle} material={m.oil} />
      <instancedMesh ref={pepperMesh} args={[g.fleck, m.pepper, pepperCount]} />
      <instancedMesh ref={herbMesh} args={[g.fleck, m.herb, Math.max(1, settings.flecks - pepperCount)]} />

      {/* Elements that lift off the plate in the craft section */}
      <mesh ref={burrata} geometry={g.burrata} material={m.burrata} position={BURRATA.pos} />
      {PLATED.map((c, i) => {
        const Component = INGREDIENTS[c.type];
        return (
          <Component
            key={i}
            ref={(el) => (plated.current[i] = el)}
            g={g}
            m={m}
            position={c.pos}
            rotation={c.rot}
            scale={c.scale ?? 1}
          />
        );
      })}

      {/* Garnish orbiting the dish */}
      <group ref={orbit}>
        {orbitConfig.map((c, i) => {
          const Component = INGREDIENTS[c.type];
          return (
            <Component
              key={i}
              ref={(el) => (orbiters.current[i] = el)}
              g={g}
              m={m}
              scale={c.type === 'pepper' ? 1.8 : 1.05}
            />
          );
        })}
      </group>
    </group>
  );
}
