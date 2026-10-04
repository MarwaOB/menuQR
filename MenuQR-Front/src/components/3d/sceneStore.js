import { createContext } from 'react';

/**
 * Mutable, render-free channel between DOM scroll choreography (GSAP) and the
 * WebGL scene. Writers: pointer listener, ScrollTrigger callbacks.
 * Reader: the scene's useFrame loop. Nothing here triggers React renders.
 */
export const sceneStore = {
  pointer: { x: 0, y: 0 }, // normalised -1…1
  explode: 0, // 0 = plated dish, 1 = ingredients separated (craft section)
  spin: 0, // extra rotation driven by scroll
};

/** Whether the WebGL scene is mounted (otherwise stages show a static illustration). */
export const SceneContext = createContext({ webgl: false });

export const STAGE_SELECTOR = '[data-scene-stage]';
