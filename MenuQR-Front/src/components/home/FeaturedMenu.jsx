import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import DishTile from './DishTile';
import Arrow from '../common/Arrow';
import MagneticLink from '../common/MagneticLink';
import PlateIllustration from '../3d/PlateIllustration';
import useScrollScene, { revealChildren } from '../../animation/useScrollScene';
import { gsap } from '../../animation/gsap';
import { pickFeatured } from '../../lib/menu';

// Asymmetric editorial grid: one tall hero dish, then a rhythm of smaller ones.
const SLOT = [
  'lg:col-span-7 lg:row-span-2',
  'lg:col-span-5',
  'lg:col-span-5',
  'lg:col-span-6',
  'lg:col-span-6',
];

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-12" aria-hidden="true">
      {SLOT.slice(0, 3).map((slot, i) => (
        <div key={i} className={slot}>
          <div className={`skeleton rounded-[1.75rem] ${i === 0 ? 'aspect-[4/5] lg:h-[36rem] lg:aspect-auto' : 'aspect-[5/4]'}`} />
          <div className="skeleton mt-5 h-6 w-2/3 rounded-full" />
          <div className="skeleton mt-3 h-4 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ status, onRetry }) {
  const { t } = useTranslation();
  const isError = status === 'error';
  return (
    <div className="grid grid-cols-1 items-center gap-10 rounded-[2rem] border border-line bg-paper/60 p-8 sm:p-12 lg:grid-cols-12">
      <PlateIllustration className="mx-auto w-48 lg:col-span-4 lg:w-64" />
      <div className="lg:col-span-7 lg:col-start-6">
        <h3 className="font-display text-display-md font-light">{isError ? t('home.menu.error') : t('home.menu.empty_title')}</h3>
        {!isError && <p className="mt-4 max-w-md text-lg text-ink-soft">{t('home.menu.empty_text')}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          {isError && (
            <button type="button" onClick={onRetry} className="btn btn-ghost">
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
              {t('home.menu.retry')}
            </button>
          )}
          <MagneticLink to="/menu/order">{t('home.menu.view_all')}</MagneticLink>
        </div>
      </div>
    </div>
  );
}

export default function FeaturedMenu({ dishes, status, onRetry }) {
  const { t } = useTranslation();
  const root = useRef(null);
  const featured = pickFeatured(dishes, 5);

  useScrollScene(
    root,
    ({ motion, desktop }, scope) => {
      if (!motion) return;
      revealChildren(scope);
      const tiles = gsap.utils.toArray('[data-tile]', scope);
      if (!tiles.length) return;
      tiles.forEach((tile, i) => {
        const media = tile.querySelector('[data-tile-media]');
        gsap.fromTo(
          media,
          { clipPath: 'inset(18% 10% 18% 10% round 1.75rem)' },
          {
            clipPath: 'inset(0% 0% 0% 0% round 1.75rem)',
            duration: 1.5,
            ease: 'expo.out',
            delay: desktop ? (i % 3) * 0.08 : 0,
            scrollTrigger: { trigger: tile, start: 'top 90%', once: true },
          }
        );
      });
      if (desktop && tiles[0]) {
        // Gentle parallax offset between the big tile and the side column.
        gsap.fromTo(
          tiles.slice(1),
          { y: 60 },
          { y: -20, ease: 'none', scrollTrigger: { trigger: scope, start: 'top bottom', end: 'bottom top', scrub: true } }
        );
      }
    },
    [status, featured.length]
  );

  return (
    <section
      ref={root}
      id="menu"
      data-bg="var(--color-cream)"
      data-tone="light"
      className="relative py-24 text-ink sm:py-32"
      aria-busy={status === 'loading'}
    >
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8">
        <div className="mb-12 flex flex-col gap-6 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p data-reveal className="eyebrow mb-5 flex items-center gap-3 text-paprika">
              <span className="h-px w-8 bg-current" aria-hidden="true" />
              {t('home.menu.eyebrow')}
            </p>
            <h2 data-reveal="1" className="font-display text-display-lg font-light">
              {t('home.menu.title')}
            </h2>
          </div>
          {status === 'ready' && (
            <Link data-reveal="2" to="/menu/order" className="group inline-flex items-center gap-2 text-sm font-semibold">
              <span className="link-underline pb-0.5">{t('home.menu.view_all')}</span>
              <Arrow />
            </Link>
          )}
        </div>

        {status === 'loading' && (
          <>
            <span className="sr-only">{t('home.menu.loading')}</span>
            <Skeleton />
          </>
        )}
        {(status === 'empty' || status === 'error') && <EmptyState status={status} onRetry={onRetry} />}

        {status === 'ready' && (
          <ul
            className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14 sm:overflow-visible sm:px-0 lg:grid-cols-12 lg:gap-x-8"
            aria-label={t('home.menu.title')}
          >
            {featured.map((dish, i) => (
              <li
                key={dish.id}
                className={`w-[78vw] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none ${featured.length === 1 ? 'lg:col-span-12' : SLOT[i]}`}
              >
                <DishTile dish={dish} size={i === 0 ? 'lg' : 'md'} className="h-full" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
