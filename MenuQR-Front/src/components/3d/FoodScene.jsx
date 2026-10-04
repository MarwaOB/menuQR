import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import FloatingDish from './FloatingDish';
import SceneLighting from './SceneLighting';
import { STAGE_SELECTOR, sceneStore } from './sceneStore';
import { TIER_SETTINGS } from '../../lib/device';

// World-space size of the composition (plate + garnish) that should fit a stage box.
const FIT = 4.4;

/**
 * Moves the dish toward whichever SceneStage is closest to the viewport centre,
 * tracking the stage's live bounding box. Damping makes it glide between
 * stages as the page scrolls.
 */
function Director({ motion, children }) {
  const root = useRef();
  const tilt = useRef();
  const float = useRef();
  const spin = useRef();
  const stages = useRef([]);
  const frame = useRef(0);
  const placed = useRef(false);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (frame.current++ % 30 === 0) stages.current = Array.from(document.querySelectorAll(STAGE_SELECTOR));

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let best = null;
    let rect = null;
    let bestDist = Infinity;
    for (const el of stages.current) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const d = Math.abs(r.top + r.height / 2 - vh / 2);
      if (d < bestDist) {
        bestDist = d;
        best = el;
        rect = r;
      }
    }
    if (!best) return;

    const { width: W, height: H } = state.viewport;
    const tx = ((rect.left + rect.width / 2) / vw - 0.5) * W;
    const ty = -((rect.top + rect.height / 2) / vh - 0.5) * H;
    const ts = ((Math.min(rect.width, rect.height) / vh) * H) / FIT;
    const tTilt = parseFloat(best.dataset.tilt) || 0;
    const tTurn = parseFloat(best.dataset.turn) || 0;
    const tExplode = best.dataset.explode ? sceneStore.explode : 0;

    const still = motion.reduced;
    const k = placed.current && !still ? 1 - Math.exp(-6 * dt) : 1;
    placed.current = true;

    const r = root.current;
    r.position.x += (tx - r.position.x) * k;
    r.position.y += (ty - r.position.y) * k;
    r.scale.setScalar(r.scale.x + (ts - r.scale.x) * k);

    motion.explode += (tExplode - motion.explode) * (still ? 1 : 1 - Math.exp(-5 * dt));

    const p = still ? { x: 0, y: 0 } : sceneStore.pointer;
    const kt = still ? 1 : 1 - Math.exp(-3 * dt);
    tilt.current.rotation.x += (tTilt - p.y * 0.12 - tilt.current.rotation.x) * kt;
    tilt.current.rotation.y += (tTurn + p.x * 0.28 - tilt.current.rotation.y) * kt;

    if (!still) {
      const t = state.clock.elapsedTime;
      float.current.position.y = Math.sin(t * 0.9) * 0.07;
      float.current.rotation.z = Math.sin(t * 0.55) * 0.035;
      // Constant slow turn, plus whatever extra rotation the scroll added since last frame.
      const lastSpin = spin.current.userData.lastSpin ?? sceneStore.spin;
      spin.current.rotation.y += dt * 0.12 + (sceneStore.spin - lastSpin);
      spin.current.userData.lastSpin = sceneStore.spin;
    }
  });

  return (
    <group ref={root}>
      <group ref={tilt}>
        <group ref={float}>
          <group ref={spin}>{children}</group>
        </group>
      </group>
    </group>
  );
}

/**
 * The single, fixed WebGL canvas behind the home page. It only renders while at
 * least one stage is near the viewport, and scales its quality to the device.
 */
export default function FoodScene({ tier = 'high', reducedMotion = false }) {
  const settings = TIER_SETTINGS[tier] || TIER_SETTINGS.mid;
  const motion = useMemo(() => ({ explode: 0, reduced: reducedMotion }), [reducedMotion]);
  const [running, setRunning] = useState(true);
  const visible = useRef(new Set());

  // Pointer parallax (fine pointers only).
  useEffect(() => {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e) => {
      sceneStore.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      sceneStore.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reducedMotion]);

  // Pause rendering when no stage is anywhere near the viewport.
  useEffect(() => {
    const seen = visible.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target)));
        setRunning(seen.size > 0);
      },
      { rootMargin: '25% 0px 25% 0px' }
    );
    const observed = new Set();
    const scan = () =>
      document.querySelectorAll(STAGE_SELECTOR).forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      });
    scan();
    const id = window.setInterval(scan, 1000);
    return () => {
      window.clearInterval(id);
      io.disconnect();
      seen.clear();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-700"
      style={{ opacity: running ? 1 : 0 }}
    >
      <Canvas
        dpr={settings.dpr}
        frameloop={running ? 'always' : 'never'}
        gl={{
          antialias: settings.antialias,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{ position: [0, 0, 10], fov: 30, near: 0.1, far: 50 }}
        style={{ pointerEvents: 'none' }}
      >
        <SceneLighting />
        <Director motion={motion}>
          <FloatingDish settings={settings} motion={motion} />
        </Director>
      </Canvas>
    </div>
  );
}
