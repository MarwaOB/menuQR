// Rough capability detection used to scale the WebGL scene.
//   high → desktop-class GPU: full geometry, antialiasing, DPR up to 2
//   mid  → phones / tablets / modest laptops: lighter geometry, DPR ≤ 1.5
//   low  → no WebGL, data-saver, or very constrained hardware: static fallback

let cachedWebGL;

export function supportsWebGL() {
  if (cachedWebGL !== undefined) return cachedWebGL;
  try {
    const canvas = document.createElement('canvas');
    cachedWebGL = !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    cachedWebGL = false;
  }
  return cachedWebGL;
}

export function getDeviceTier() {
  if (typeof window === 'undefined' || !supportsWebGL()) return 'low';

  const nav = navigator;
  const saveData = nav.connection?.saveData;
  const memory = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = window.innerWidth < 768;

  if (saveData || memory <= 2 || cores <= 2) return 'low';
  if (coarse || small || memory <= 4 || cores <= 4) return 'mid';
  return 'high';
}

export const TIER_SETTINGS = {
  high: { dpr: [1, 2], antialias: true, segments: 96, flecks: 46, orbiters: 9 },
  mid: { dpr: [1, 1.5], antialias: true, segments: 56, flecks: 22, orbiters: 5 },
  low: { dpr: [1, 1], antialias: false, segments: 40, flecks: 12, orbiters: 3 },
};
