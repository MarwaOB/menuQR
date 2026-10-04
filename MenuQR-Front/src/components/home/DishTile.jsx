import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Arrow from '../common/Arrow';
import { dishImage, tintFor } from '../../lib/menu';
import { formatPrice } from '../../lib/format';

/**
 * Editorial dish card for the home page. Tilts slightly toward the pointer,
 * zooms the photo, and slides in an "Order" pill on hover.
 * Without a photo it becomes a tinted typographic panel.
 */
export default function DishTile({ dish, size = 'md', className = '' }) {
  const { t, i18n } = useTranslation();
  const card = useRef(null);
  const image = dishImage(dish);
  const tint = tintFor(dish.section_name || dish.name);
  const price = formatPrice(dish.price, i18n.language);

  const onMove = (e) => {
    if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = card.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.current.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
    card.current.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
  };
  const onLeave = () => {
    card.current.style.setProperty('--rx', '0deg');
    card.current.style.setProperty('--ry', '0deg');
  };

  const aspect = size === 'lg' ? 'aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[36rem]' : 'aspect-[4/5] sm:aspect-[5/4]';

  return (
    <Link
      ref={card}
      to={`/menu/order?dish=${dish.id}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      data-tile
      className={`group relative flex flex-col [perspective:1200px] ${className}`}
      aria-label={`${dish.name}${price ? ` — ${price} ${t('currency')}` : ''}`}
    >
      <div
        className="flex h-full flex-col transition-transform duration-700 ease-[var(--ease-out-expo)] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] [transform-style:preserve-3d]"
      >
        <div data-tile-media className={`relative overflow-hidden rounded-[1.75rem] ${aspect}`} style={{ background: tint.bg }}>
          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.07]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true" style={{ color: tint.fg }}>
              <span className="absolute h-[70%] max-h-80 rounded-full border border-current opacity-20 transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-110 aspect-square" />
              <span className="font-display text-[clamp(5rem,12vw,10rem)] italic font-light leading-none transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105">
                {dish.name?.trim().charAt(0)}
              </span>
            </div>
          )}

          {dish.section_name && (
            <span className="absolute top-4 rounded-full bg-paper/85 px-3 py-1 text-xs font-medium text-ink backdrop-blur ltr:left-4 rtl:right-4">
              {dish.section_name}
            </span>
          )}

          <span className="absolute bottom-4 flex translate-y-3 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper opacity-0 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ltr:right-4 rtl:left-4">
            {t('home.menu.order')}
            <Arrow size={14} />
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 pt-5">
          <div className="min-w-0">
            <h3 className={`font-display leading-tight ${size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{dish.name}</h3>
            {dish.description && <p className="mt-2 line-clamp-2 max-w-md text-sm leading-relaxed text-ink-soft">{dish.description}</p>}
          </div>
          {price && (
            <p className="shrink-0 pt-1 text-end font-display text-xl tabular-nums">
              {price}
              <span className="ms-1 align-top text-[0.65rem] font-sans font-medium text-muted">{t('currency')}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
