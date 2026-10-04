import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import QuantityStepper from './QuantityStepper';
import { dishImage, tintFor } from '../../lib/menu';
import { formatPrice } from '../../lib/format';

/**
 * Menu item. Mobile: compact row (copy left, photo right) for fast scanning.
 * ≥ sm: vertical card with a large photo. "Add" turns into a stepper once
 * the dish is in the order.
 */
function OrderDishCard({ dish, quantity = 0, onAdd, onQuantity, highlighted = false }) {
  const { t, i18n } = useTranslation();
  const image = dishImage(dish);
  const tint = tintFor(dish.section_name || dish.name);
  const price = formatPrice(dish.price, i18n.language);

  return (
    <article
      id={`dish-${dish.id}`}
      className={`group relative flex scroll-mt-40 gap-4 rounded-[1.5rem] bg-paper p-3 transition-shadow duration-500 sm:flex-col sm:gap-0 sm:p-0 ${
        highlighted ? 'ring-2 ring-paprika ring-offset-4 ring-offset-cream' : 'ring-1 ring-line/60 hover:shadow-[0_24px_50px_-30px_rgb(27_22_17/0.35)]'
      }`}
    >
      <div
        className="relative order-2 aspect-square w-28 shrink-0 overflow-hidden rounded-2xl sm:order-1 sm:aspect-[4/3] sm:w-full sm:rounded-b-none sm:rounded-t-[1.5rem]"
        style={{ background: tint.bg }}
      >
        {image ? (
          <img
            src={image}
            alt={dish.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center font-display text-5xl italic font-light sm:text-7xl"
            style={{ color: tint.fg }}
          >
            {dish.name?.trim().charAt(0)}
          </span>
        )}
        {quantity > 0 && (
          <span className="absolute top-2 rounded-full bg-paprika px-2 py-0.5 text-[0.7rem] font-semibold text-paper ltr:left-2 rtl:right-2">
            ×{quantity}
          </span>
        )}
      </div>

      <div className="order-1 flex min-w-0 flex-1 flex-col sm:order-2 sm:p-5">
        <h3 className="font-display text-xl leading-snug sm:text-2xl">{dish.name}</h3>
        {dish.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft sm:line-clamp-3">{dish.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="font-semibold tabular-nums">
            {price}
            {price && <span className="ms-1 text-xs font-medium text-muted">{t('currency')}</span>}
          </p>
          {quantity > 0 ? (
            <QuantityStepper name={dish.name} quantity={quantity} onChange={(q) => onQuantity(dish.id, q)} size="sm" />
          ) : (
            <button
              type="button"
              onClick={() => onAdd(dish)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-paper transition-colors duration-300 hover:bg-paprika active:scale-95"
              aria-label={t('order.add_named', { name: dish.name })}
            >
              <Plus size={15} strokeWidth={2.25} aria-hidden="true" />
              {t('order.add')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(OrderDishCard);
