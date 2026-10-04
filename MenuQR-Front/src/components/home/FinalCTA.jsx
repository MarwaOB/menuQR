import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SceneStage from '../3d/SceneStage';
import MagneticLink from '../common/MagneticLink';
import Marquee from './Marquee';
import useScrollScene from '../../animation/useScrollScene';
import { gsap } from '../../animation/gsap';

export default function FinalCTA() {
  const { t } = useTranslation();
  const root = useRef(null);

  useScrollScene(root, ({ motion }, scope) => {
    if (!motion) return;
    gsap.fromTo(
      '[data-cta-line]',
      { yPercent: 135 },
      { yPercent: 0, duration: 1.4, stagger: 0.12, scrollTrigger: { trigger: scope, start: 'top 65%', once: true } }
    );
    gsap.fromTo(
      '[data-cta-in]',
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, delay: 0.4, scrollTrigger: { trigger: scope, start: 'top 65%', once: true } }
    );
    gsap.fromTo(
      '[data-cta-title]',
      { scale: 0.92 },
      { scale: 1, ease: 'none', scrollTrigger: { trigger: scope, start: 'top bottom', end: 'center center', scrub: true } }
    );
  });

  return (
    <section
      ref={root}
      data-bg="var(--color-paprika)"
      data-tone="dark"
      className="relative overflow-hidden text-paper"
      aria-labelledby="cta-title"
    >
      <div className="mx-auto grid min-h-svh max-w-[90rem] grid-cols-1 items-center gap-6 px-5 py-28 sm:px-8 lg:grid-cols-12">
        <div className="relative z-10 lg:col-span-7">
          <h2 id="cta-title" data-cta-title className="origin-left font-display text-display-xl font-light rtl:origin-right">
            <span className="line-mask">
              <span data-cta-line>{t('home.cta.l1')}</span>
            </span>
            <span className="line-mask">
              <span data-cta-line className="italic text-saffron">
                {t('home.cta.l2')}
              </span>
            </span>
          </h2>
          <p data-cta-in className="mt-8 font-display text-2xl italic text-paper/85 sm:text-3xl">
            {t('home.cta.text')}
          </p>
          <div data-cta-in className="mt-10 flex flex-wrap gap-3">
            <MagneticLink to="/menu/order" variant="light">
              {t('home.cta.order')}
            </MagneticLink>
            <MagneticLink to="/menu/order" variant="ghost" arrow={false} className="hover:!border-paper hover:!bg-paper hover:!text-paprika">
              {t('home.cta.menu')}
            </MagneticLink>
          </div>
        </div>
        <SceneStage name="cta" tilt={0.75} turn={-0.5} className="mx-auto aspect-square w-full max-w-[22rem] lg:col-span-5 lg:max-w-none" />
      </div>

      <Marquee
        className="border-t border-paper/20 py-6 font-display text-3xl italic text-paper/90 sm:text-4xl"
        items={[t('home.story.l1'), t('home.story.l2'), t('home.story.l3'), t('home.hero.today')]}
      />
    </section>
  );
}
