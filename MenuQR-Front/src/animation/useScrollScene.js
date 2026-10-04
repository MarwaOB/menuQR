import { useLayoutEffect, useRef } from 'react';
import { gsap, MQ } from './gsap';

/**
 * Scoped GSAP setup for one section.
 * `setup(conditions, scope)` runs inside gsap.matchMedia, with
 * conditions = { motion, reduced, desktop }. Everything created inside is
 * reverted automatically on unmount, on media changes and when deps change.
 */
export default function useScrollScene(scopeRef, setup, deps = []) {
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;
    const mm = gsap.matchMedia(scope);
    mm.add({ motion: MQ.motion, reduced: MQ.reduced, desktop: MQ.desktop }, (ctx) =>
      setupRef.current(ctx.conditions, scope)
    );
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Fade/rise every `[data-reveal]` inside the scope as it enters the viewport. */
// `data-reveal="2"` delays an element by two stagger steps relative to its trigger.
export function revealChildren(scope, { y = 36, stagger = 0.1 } = {}) {
  const items = gsap.utils.toArray('[data-reveal]', scope);
  if (!items.length) return;
  gsap.set(items, { autoAlpha: 0, y });
  items.forEach((el) => {
    gsap.to(el, {
      autoAlpha: 1,
      y: 0,
      duration: 1.2,
      delay: (parseFloat(el.dataset.reveal) || 0) * stagger,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}
