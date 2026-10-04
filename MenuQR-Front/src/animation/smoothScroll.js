import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';

// One Lenis instance at a time (the home page), shared through this module.
let lenis = null;

export function getLenis() {
  return lenis;
}

/** Scroll to a selector/element/number, smoothly when Lenis is active. */
export function scrollToTarget(target, { offset = 0, immediate = false } = {}) {
  if (lenis) {
    lenis.scrollTo(target, { offset, immediate, duration: 1.4 });
    return;
  }
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (typeof el === 'number') {
    window.scrollTo({ top: el, behavior: immediate ? 'auto' : 'smooth' });
  } else if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY + offset;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: immediate || reduced ? 'auto' : 'smooth' });
  }
}

export function stopScroll() {
  lenis?.stop();
}
export function startScroll() {
  lenis?.start();
}

/**
 * Lenis smooth scrolling synced with GSAP's ticker and ScrollTrigger.
 * Disabled for reduced motion; touch devices keep native scrolling.
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis = instance;
    const onScroll = () => ScrollTrigger.update();
    instance.on('scroll', onScroll);
    const tick = (time) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      instance.destroy();
      if (lenis === instance) lenis = null;
    };
  }, [enabled]);
}
