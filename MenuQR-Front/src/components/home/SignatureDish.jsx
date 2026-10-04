import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SceneStage from '../3d/SceneStage';
import MagneticLink from '../common/MagneticLink';
import useScrollScene, { revealChildren } from '../../animation/useScrollScene';
import { gsap } from '../../animation/gsap';
import { dishImage, pickSignature } from '../../lib/menu';
import { formatPrice } from '../../lib/format';
import site from '../../data/site';

/** Rotating circular label around the dish photo. */
function Badge({ label }) {
  const text = `${label} · ${label} · ${label} · `;
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full animate-spin-slow motion-reduce:animate-none" aria-hidden="true">
      <defs>
        <path id="badge-circle" d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" />
      </defs>
      <text className="fill-current text-[10.5px] font-semibold uppercase tracking-[0.28em]">
        <textPath href="#badge-circle">{text}</textPath>
      </text>
    </svg>
  );
}

export default function SignatureDish({ dishes, status }) {
  const { t, i18n } = useTranslation();
  const root = useRef(null);
  const { dish, isSignature } = pickSignature(dishes, site.signatureDishName);
  const image = dishImage(dish);
  const eyebrow = isSignature ? t('home.signature.eyebrow_signature') : t('home.signature.eyebrow');

  useScrollScene(
    root,
    ({ motion }, scope) => {
      if (!motion) return;
      revealChildren(scope);
      const frame = scope.querySelector('[data-sig-frame]');
      if (frame) {
        gsap.fromTo(
          frame,
          { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 0 0)' },
          {
            clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0 0)',
            duration: 1.6,
            ease: 'expo.inOut',
            scrollTrigger: { trigger: frame, start: 'top 80%', once: true },
          }
        );
        gsap.fromTo(
          frame.querySelector('img'),
          { scale: 1.35 },
          { scale: 1, ease: 'none', scrollTrigger: { trigger: scope, start: 'top bottom', end: 'bottom top', scrub: true } }
        );
      }
      gsap.fromTo(
        '[data-sig-name]',
        { yPercent: 135 },
        { yPercent: 0, duration: 1.4, scrollTrigger: { trigger: '[data-sig-name]', start: 'top 88%', once: true } }
      );
    },
    [dish?.id, status]
  );

  return (
    <section
      ref={root}
      id="signature"
      data-bg="var(--color-cream)"
      data-tone="light"
      className="relative py-24 text-ink sm:py-32 lg:py-40"
    >
      <div className="mx-auto grid max-w-[90rem] grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-8">
        {/* Visual */}
        <div className="relative lg:col-span-6">
          {image ? (
            <div className="group relative mx-auto w-full max-w-[34rem]">
              <div
                data-sig-frame
                className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-sand"
                style={{ clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0 0)' }}
              >
                <img
                  src={image}
                  alt={dish.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                />
              </div>
              <div className="absolute -bottom-10 h-28 w-28 rounded-full bg-paprika p-2 text-paper shadow-xl ltr:-right-4 rtl:-left-4 sm:h-36 sm:w-36 sm:ltr:-right-10 sm:rtl:-left-10">
                <Badge label={eyebrow} />
              </div>
            </div>
          ) : (
            <SceneStage name="signature" tilt={0.82} turn={0.35} className="mx-auto aspect-square w-full max-w-[38rem]" />
          )}
        </div>

        {/* Copy */}
        <div className="relative lg:col-span-5 lg:col-start-8">
          <p data-reveal className="eyebrow mb-6 flex items-center gap-3 text-paprika">
            <span className="h-px w-8 bg-current" aria-hidden="true" />
            {eyebrow}
            {dish?.section_name && (
              <span className="text-muted">
                — {t('home.signature.from')} {dish.section_name}
              </span>
            )}
          </p>

          <h2 className="font-display text-display-lg font-light">
            <span className="line-mask">
              <span data-sig-name>{dish ? dish.name : t('home.signature.fallback_title')}</span>
            </span>
          </h2>

          <p data-reveal="1" className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            {dish?.description || t('home.signature.fallback_text')}
          </p>

          {dish && formatPrice(dish.price, i18n.language) && (
            <p data-reveal="2" className="mt-8 flex items-baseline gap-2 border-t border-line pt-6">
              <span className="font-display text-5xl font-light tabular-nums">{formatPrice(dish.price, i18n.language)}</span>
              <span className="text-sm font-medium text-muted">{t('currency')}</span>
            </p>
          )}

          <div data-reveal="3" className="mt-8 flex flex-wrap gap-3">
            {dish ? (
              <>
                <MagneticLink to={`/menu/order?dish=${dish.id}`}>{t('home.signature.order')}</MagneticLink>
                <MagneticLink to="/menu/order" variant="ghost" arrow={false}>
                  {t('home.signature.see_menu')}
                </MagneticLink>
              </>
            ) : (
              <MagneticLink to="/menu/order">{t('home.signature.see_menu')}</MagneticLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
