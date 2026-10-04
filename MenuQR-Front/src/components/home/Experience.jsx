import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import MagneticLink from '../common/MagneticLink';
import useScrollScene, { revealChildren } from '../../animation/useScrollScene';
import { gsap } from '../../animation/gsap';

/** Table card with a stylised QR code — dine-in ordering. */
function TableArt() {
  const cells = [
    1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1,
    1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0,
    0, 0, 1,
  ];
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full" aria-hidden="true">
      <rect x="40" y="30" width="160" height="190" rx="14" fill="#fbf7f0" />
      <rect x="40" y="30" width="160" height="190" rx="14" fill="none" stroke="#1b1611" strokeOpacity=".12" />
      <text x="120" y="70" textAnchor="middle" fontFamily="Fraunces, serif" fontStyle="italic" fontSize="28" fill="#b5401f">
        12
      </text>
      <g transform="translate(75 88)">
        {cells.map((on, i) =>
          on ? <rect key={i} x={(i % 9) * 10} y={Math.floor(i / 9) * 10} width="9" height="9" rx="1.5" fill="#1b1611" /> : null
        )}
      </g>
      <rect x="92" y="196" width="56" height="4" rx="2" fill="#1b1611" opacity=".2" />
    </svg>
  );
}

/** Route line to a door — delivery. */
function RouteArt() {
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full" aria-hidden="true">
      <path
        data-route
        d="M30 200 C 70 200, 60 140, 110 140 S 150 70, 200 60"
        fill="none"
        stroke="#b5401f"
        strokeWidth="3"
        strokeDasharray="6 9"
        strokeLinecap="round"
      />
      <circle cx="30" cy="200" r="9" fill="#1b1611" />
      <circle cx="30" cy="200" r="18" fill="none" stroke="#1b1611" strokeOpacity=".2" />
      <g transform="translate(176 22)">
        <path d="M24 0 L48 18 V54 H0 V18 Z" fill="#fbf7f0" stroke="#1b1611" strokeOpacity=".15" />
        <rect x="17" y="30" width="14" height="24" rx="2" fill="#b5401f" />
        <circle cx="27" cy="43" r="1.5" fill="#fbf7f0" />
      </g>
    </svg>
  );
}

const PANELS = [
  { key: 'dine', type: 'dine-in', Art: TableArt, bg: 'bg-paprika-soft' },
  { key: 'deliv', type: 'delivery', Art: RouteArt, bg: 'bg-sand' },
];

export default function Experience() {
  const { t } = useTranslation();
  const root = useRef(null);

  useScrollScene(root, ({ motion }, scope) => {
    if (!motion) return;
    revealChildren(scope);
    gsap.utils.toArray('[data-panel]', scope).forEach((panel, i) => {
      gsap.fromTo(
        panel,
        { clipPath: 'inset(12% 6% 12% 6% round 2rem)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 2rem)',
          duration: 1.6,
          delay: i * 0.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: panel, start: 'top 85%', once: true },
        }
      );
      gsap.fromTo(
        panel.querySelector('[data-art]'),
        { yPercent: 12, rotate: i ? 4 : -4 },
        { yPercent: -8, rotate: 0, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true } }
      );
    });
    const route = scope.querySelector('[data-route]');
    if (route) {
      gsap.fromTo(route, { strokeDashoffset: 300 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: route, start: 'top 90%', end: 'top 30%', scrub: true } });
    }
  });

  return (
    <section
      ref={root}
      id="experience"
      data-bg="var(--color-cream)"
      data-tone="light"
      className="relative py-24 text-ink sm:py-32"
    >
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8">
        <div className="mb-12 max-w-2xl sm:mb-16">
          <p data-reveal className="eyebrow mb-5 flex items-center gap-3 text-paprika">
            <span className="h-px w-8 bg-current" aria-hidden="true" />
            {t('home.experience.eyebrow')}
          </p>
          <h2 data-reveal="1" className="font-display text-display-lg font-light">
            {t('home.experience.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {PANELS.map((panel) => {
            const { key, type, Art, bg } = panel;
            return (
            <article
              key={key}
              data-panel
              className={`group relative flex min-h-[30rem] flex-col justify-between overflow-hidden rounded-[2rem] p-8 sm:p-10 ${bg}`}
            >
              <div data-art className="pointer-events-none absolute top-6 h-56 w-56 opacity-95 transition-transform duration-1000 ease-[var(--ease-out-expo)] group-hover:scale-105 sm:h-72 sm:w-72 ltr:right-4 rtl:left-4">
                <Art />
              </div>
              <span className="font-display text-sm italic text-paprika">{type === 'dine-in' ? '01' : '02'}</span>
              <div className="relative max-w-sm">
                <h3 className="font-display text-4xl sm:text-5xl">{t(`home.experience.${key}_title`)}</h3>
                <p className="mt-4 leading-relaxed text-ink-soft">{t(`home.experience.${key}_text`)}</p>
                <MagneticLink to={`/menu/order?type=${type}`} variant="dark" className="mt-8">
                  {t(`home.experience.cta_${key === 'dine' ? 'dine' : 'deliv'}`)}
                </MagneticLink>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
