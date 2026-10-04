import * as THREE from 'three';

// Procedural geometry for the dish. Everything is generated once, in a few
// milliseconds, so there is no model file to download.

/** Shallow ceramic plate: well, rising rim and a rolled lip, as a lathe. */
export function createPlateGeometry(segments = 96) {
  const profile = [
    [0.0, 0.08], [0.9, 0.08], [1.05, 0.1], [1.3, 0.17], [1.55, 0.25], [1.66, 0.275],
    [1.71, 0.255], [1.67, 0.21], [1.46, 0.16], [1.12, 0.065], [1.02, 0.0], [0.94, 0.0],
    [0.9, 0.03], [0.0, 0.03],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.LatheGeometry(profile, segments);
  geometry.computeVertexNormals();
  return geometry;
}

/** Irregular sauce pool with a gently domed surface. */
export function createSauceGeometry(radius = 0.98, segments = 96) {
  const geometry = new THREE.CircleGeometry(radius, segments, 0, Math.PI * 2);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.y);
    if (r > radius * 0.5) {
      const a = Math.atan2(v.y, v.x);
      const wobble = 1 + 0.06 * Math.sin(a * 5 + 0.7) + 0.035 * Math.sin(a * 11 + 2.1) + 0.02 * Math.sin(a * 23);
      v.x *= wobble;
      v.y *= wobble;
    }
    const rr = Math.min(1, Math.hypot(v.x, v.y) / radius);
    v.z = (1 - rr * rr) * 0.035;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/** Soft, slightly lumpy burrata. */
export function createBurrataGeometry(segments = 64) {
  const geometry = new THREE.SphereGeometry(0.42, segments, Math.round(segments / 2));
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 9 + 1.3) * Math.sin(v.z * 8 + 0.4) * 0.018 +
      Math.sin(v.y * 14 + v.x * 6) * 0.01 +
      (v.y > 0.3 ? Math.sin(Math.atan2(v.z, v.x) * 6) * 0.02 : 0); // pinched top
    v.addScaledVector(v.clone().normalize(), n);
    v.y *= v.y < 0 ? 0.5 : 0.82; // flatter base where it rests
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createTomatoGeometry(segments = 32) {
  const geometry = new THREE.SphereGeometry(0.15, segments, Math.round(segments * 0.75));
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setY(i, y * (y > 0 ? 0.86 : 0.92));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Halved cherry tomato: skin dome (cut face up) — the flesh is a separate disc. */
export function createTomatoHalfGeometry(segments = 32) {
  const skin = new THREE.SphereGeometry(0.155, segments, Math.round(segments / 2), 0, Math.PI * 2, 0, Math.PI / 2);
  skin.rotateX(Math.PI);
  skin.scale(1, 0.85, 1);
  const flesh = new THREE.CircleGeometry(0.152, segments);
  flesh.rotateX(-Math.PI / 2);
  const seeds = new THREE.CircleGeometry(0.075, Math.round(segments / 2));
  seeds.rotateX(-Math.PI / 2);
  seeds.translate(0, 0.002, 0);
  return { skin, flesh, seeds };
}

/** Five-pointed calyx that sits on top of whole tomatoes. */
export function createCalyxGeometry() {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i <= points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.075 : 0.02;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Basil leaf: bezier outline, folded along the midrib and curled at the tip. */
export function createLeafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.13, 0.06, 0.16, 0.3, 0, 0.46);
  s.bezierCurveTo(-0.16, 0.3, -0.13, 0.06, 0, 0);
  const geometry = new THREE.ShapeGeometry(s, 14);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.abs(x) * 0.35 - (y - 0.2) * (y - 0.2) * 0.35);
  }
  geometry.translate(0, -0.2, 0);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/** Olive-oil drizzle: a thin tube spiralling over the sauce. */
export function createDrizzleGeometry(segments = 96) {
  const points = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = t * Math.PI * 2.6 + 0.6;
    const r = 0.5 + 0.32 * Math.sin(t * Math.PI);
    points.push(new THREE.Vector3(Math.cos(a) * r, 0.125 + Math.sin(t * 9) * 0.004, Math.sin(a) * r * 0.9));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, segments, 0.014, 6, false);
}

/** Radial-gradient texture for the soft contact shadow under the plate. */
export function createShadowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(60,32,20,0.55)');
  g.addColorStop(0.45, 'rgba(60,32,20,0.25)');
  g.addColorStop(1, 'rgba(60,32,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Deterministic pseudo-random so the composition is identical on every load. */
export function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
