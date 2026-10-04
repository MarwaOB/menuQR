import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap } from '../../animation/gsap';
import site from '../../data/site';

/**
 * Brief intro (≈1.5s, first visit of the session only): wordmark rises, a
 * hairline fills, then the panel lifts to reveal the hero. Never waits on
 * network or WebGL.
 */
export default function Loader({ onDone }) {
  const { t } = useTranslation();
  const root = useRef(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('[data-loader-word]', { yPercent: 135, duration: 1 })
        .from('[data-loader-caption]', { autoAlpha: 0, duration: 0.6 }, 0.25)
        .fromTo('[data-loader-line]', { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0.15)
        .add(() => doneRef.current?.(), '-=0.05')
        .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.05')
        .set(root.current, { display: 'none' });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-cream text-ink"
      style={{ clipPath: 'inset(0 0 0 0)' }}
      aria-hidden="true"
    >
      <span className="line-mask">
        <span data-loader-word className="font-display text-5xl italic sm:text-7xl">
          {site.name}
        </span>
      </span>
      <span data-loader-line className="mt-6 block h-px w-40 origin-left bg-paprika rtl:origin-right" />
      <span data-loader-caption className="eyebrow mt-4 text-muted">
        {t('home.loader')}
      </span>
    </div>
  );
}
