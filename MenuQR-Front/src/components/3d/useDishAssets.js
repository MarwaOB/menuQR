import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  createBurrataGeometry,
  createCalyxGeometry,
  createDrizzleGeometry,
  createLeafGeometry,
  createPlateGeometry,
  createSauceGeometry,
  createShadowTexture,
  createTomatoGeometry,
  createTomatoHalfGeometry,
} from './geometry';

/** Geometries + materials for the dish, created once per tier and disposed on unmount. */
export default function useDishAssets(settings) {
  const assets = useMemo(() => {
    const seg = settings.segments;
    const half = createTomatoHalfGeometry(Math.max(20, seg / 3));
    const geometries = {
      plate: createPlateGeometry(seg),
      rim: new THREE.TorusGeometry(1.665, 0.011, 8, seg),
      sauce: createSauceGeometry(0.98, seg),
      burrata: createBurrataGeometry(Math.max(32, seg * 0.6)),
      tomato: createTomatoGeometry(Math.max(20, seg / 3)),
      halfSkin: half.skin,
      halfFlesh: half.flesh,
      halfSeeds: half.seeds,
      calyx: createCalyxGeometry(),
      leaf: createLeafGeometry(),
      drizzle: createDrizzleGeometry(seg),
      fleck: new THREE.SphereGeometry(1, 6, 4),
      shadow: new THREE.PlaneGeometry(1, 1),
    };

    const shadowTexture = createShadowTexture();
    const materials = {
      ceramic: new THREE.MeshPhysicalMaterial({ color: '#f7f2e9', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
      rim: new THREE.MeshStandardMaterial({ color: '#b5401f', roughness: 0.4 }),
      sauce: new THREE.MeshPhysicalMaterial({ color: '#a8331b', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
      burrata: new THREE.MeshPhysicalMaterial({ color: '#f6f1e7', roughness: 0.55, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5 }),
      skin: new THREE.MeshPhysicalMaterial({ color: '#c7261a', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
      flesh: new THREE.MeshStandardMaterial({ color: '#e0503a', roughness: 0.45 }),
      seeds: new THREE.MeshStandardMaterial({ color: '#f2a070', roughness: 0.35 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#3c6a28', roughness: 0.45, side: THREE.DoubleSide }),
      calyx: new THREE.MeshStandardMaterial({ color: '#4d7a2c', roughness: 0.6, side: THREE.DoubleSide }),
      oil: new THREE.MeshPhysicalMaterial({ color: '#d9b236', roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85 }),
      pepper: new THREE.MeshStandardMaterial({ color: '#2a1f18', roughness: 0.8 }),
      herb: new THREE.MeshStandardMaterial({ color: '#5b7d34', roughness: 0.7 }),
      shadow: new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.6 }),
    };

    return { geometries, materials, shadowTexture };
  }, [settings.segments]);

  useEffect(
    () => () => {
      Object.values(assets.geometries).forEach((g) => g.dispose());
      Object.values(assets.materials).forEach((m) => m.dispose());
      assets.shadowTexture.dispose();
    },
    [assets]
  );

  return assets;
}
