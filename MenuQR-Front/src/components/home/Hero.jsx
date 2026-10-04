import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown } from 'lucide-react';
import SceneStage from '../3d/SceneStage';
import MagneticLink from '../common/MagneticLink';
import useScrollScene from '../../animation/useScrollScene';
import { gsap } from '../../animation/gsap';
import { scrollToTarget } from '../../animation/smoothScroll';
import { sceneStore } from '../3d/sceneStore';
import { formatMenuDate } from '../../lib/format';

export default function Hero({ ready, menu }) {
  const { t, i18n } = useTranslation();
  const root = useRef(null);
  const menuDate = formatMenuDate(menu?.date, i18n.language);

  useScrollScene(
    root,
    ({ motion }, scope) => {
      if (!motion) {
        gsap.set(scope.querySelectorAll('[data-hero-in], [data-hero-line]'), { clearProps: 'all' });
        return;
      }
      // Hold the intro until the loader lifts.
      gsap.set('[data-hero-line]', { yPercent: 135 });
      gsap.set('[data-hero-in]', { autoAlpha: 0, y: 24 });
      const sun = document.querySelector('[data-hero-sun]');
      if (sun) gsap.set(sun, { scale: 0.7, autoAlpha: 0 });

      if (ready) {
        const tl = gsap.timeline({ delay: 0.1 });
        tl.to('[data-hero-line]', { yPercent: 0, duration: 1.5, stagger: 0.12 })
          .to(sun, { scale: 1, autoAlpha: 1, duration: 2 }, 0)
          .to('[data-hero-in]', { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.45);
      }

      // Leaving the hero: copy drifts up and fades, the dish turns.
      gsap.to('[data-hero-copy]', {
        yPercent: -12,
        autoAlpha: 0.15,
        ease: 'none',
        scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom top', scrub: true },
      });
      if (sun) gsap.to(sun, {
        yPercent: 25,
        ease: 'none',
        scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to(sceneStore, {
        spin: Math.PI * 0.6,
        ease: 'none',
        scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom top', scrub: true },
      });
    },
    [ready]
  );

  return (
    <section
      ref={root}
      id="top"
      data-bg="var(--color-cream)"
      data-tone="light"
      className="relative overflow-hidden pt-[var(--header-h)] text-ink"
    >
      <div className="relative mx-auto grid min-h-[calc(100svh-var(--header-h))] max-w-[90rem] grid-cols-1 items-center px-5 sm:px-8 lg:grid-cols-12">
        <div data-hero-copy className="relative z-10 pb-28 pt-6 lg:col-span-7 lg:py-16">
          <p data-hero-in className="eyebrow mb-6 flex items-center gap-3 text-paprika">
            <span className="h-px w-8 bg-current" aria-hidden="true" />
            {t('home.hero.eyebrow')}
          </p>

          <h1 className="font-display text-display-xl font-light">
            <span className="line-mask">
              <span data-hero-line>{t('home.hero.line1')}</span>
            </span>
            <span className="line-mask">
              <span data-hero-line className="italic text-paprika">
                {t('home.hero.line2')}
              </span>
            </span>
          </h1>

          {/* Mobile: the dish sits between the headline and the copy */}
          <SceneStage name="hero-mobile" tilt={0.9} className="mx-auto my-2 aspect-square w-full max-w-[24rem] lg:hidden" />

          <p data-hero-in className="max-w-md text-lg leading-relaxed text-ink-soft lg:mt-8">
            {t('home.hero.lead')}
          </p>

          <div data-hero-in className="mt-8 flex flex-wrap items-center gap-3">
            <MagneticLink to="/menu/order">{t('home.hero.cta_order')}</MagneticLink>
            <MagneticLink
              href="#menu"
              variant="ghost"
              arrow={false}
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget('#menu');
              }}
            >
              {t('home.hero.cta_menu')}
            </MagneticLink>
          </div>
        </div>

        <div className="relative hidden h-full lg:col-span-5 lg:block">
          <SceneStage
            name="hero"
            tilt={0.86}
            turn={-0.2}
            className="absolute top-1/2 aspect-square w-[min(50vw,86vh)] -translate-y-1/2 ltr:-left-[18%] rtl:-right-[18%]"
          />
        </div>
      </div>

      {/* Bottom rail: scroll cue + live menu stamp */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto flex max-w-[90rem] items-end justify-between gap-4 px-5 pb-6 sm:px-8">
          <a
            data-hero-in
            href="#signature"
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget('#signature');
            }}
            className="group flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-ink-soft"
          >
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-ink/20">
              <ArrowDown size={15} strokeWidth={1.5} className="animate-cue" />
            </span>
            <span className="hidden sm:inline">{t('home.hero.scroll')}</span>
          </a>

          {menu?.name && (
            <p data-hero-in className="hidden text-end text-sm text-ink-soft sm:block">
              <span className="eyebrow block text-paprika">{t('home.hero.today')}</span>
              <span className="font-display text-lg italic text-ink">{menu.name}</span>
              {menuDate && <span className="ms-2">· {menuDate}</span>}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
