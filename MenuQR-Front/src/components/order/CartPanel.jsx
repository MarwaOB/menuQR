import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bike, Check, Loader2, ShoppingBag, UtensilsCrossed, X } from 'lucide-react';
import QuantityStepper from './QuantityStepper';
import { dishImage, tintFor } from '../../lib/menu';
import { formatPrice } from '../../lib/format';

const ORDER_TYPES = [
  { id: 'dine-in', Icon: UtensilsCrossed, title: 'customer.dine_in', desc: 'customer.dine_in_desc' },
  { id: 'delivery', Icon: Bike, title: 'customer.delivery', desc: 'customer.delivery_desc' },
];

const field =
  'w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-muted/70 transition-shadow focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10';

function CartLine({ item, onQuantity }) {
  const { t, i18n } = useTranslation();
  const image = dishImage(item);
  const tint = tintFor(item.section_name || item.name);
  return (
    <li className="flex items-center gap-4 py-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl" style={{ background: tint.bg, color: tint.fg }}>
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="font-display text-2xl italic" aria-hidden="true">
            {item.name?.trim().charAt(0)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="mt-0.5 text-sm text-muted tabular-nums">
          {formatPrice(item.price, i18n.language)} {t('currency')}
        </p>
        <div className="mt-2">
          <QuantityStepper name={item.name} quantity={item.quantity} onChange={(q) => onQuantity(item.id, q)} size="sm" tone="light" />
        </div>
      </div>
      <p className="self-start pt-0.5 text-sm font-semibold tabular-nums">
        {formatPrice(Number(item.price || 0) * item.quantity, i18n.language)}
      </p>
    </li>
  );
}

/**
 * Order drawer (≥ lg: slides from the inline end) / bottom sheet (mobile:
 * slides up, drag the handle down to dismiss). Steps: review → details → success.
 */
export default function CartPanel({
  open,
  onClose,
  step,
  setStep,
  cart,
  count,
  total,
  onQuantity,
  clientType,
  setClientType,
  tableNumber,
  setTableNumber,
  deliveryAddress,
  setDeliveryAddress,
  phoneNumber,
  setPhoneNumber,
  onPlaceOrder,
  isSubmitting,
  formError,
}) {
  const { t, i18n } = useTranslation();
  const panel = useRef(null);
  const closeBtn = useRef(null);
  const drag = useRef({ startY: 0, dy: 0, active: false });

  // Focus management, Escape, and background scroll lock.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const id = requestAnimationFrame(() => closeBtn.current?.focus());
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = panel.current.querySelectorAll('button:not([disabled]), input, textarea, a[href]');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  // Drag-to-dismiss for the mobile sheet.
  const onPointerDown = (e) => {
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    drag.current = { startY: e.clientY, dy: 0, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
    panel.current.style.transition = 'none';
  };
  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    panel.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onPointerUp = () => {
    if (!drag.current.active) return;
    const shouldClose = drag.current.dy > 110;
    drag.current.active = false;
    panel.current.style.transition = '';
    panel.current.style.transform = '';
    if (shouldClose) onClose();
  };

  const placeDisabled =
    !clientType ||
    (clientType === 'dine-in' && !String(tableNumber).trim()) ||
    (clientType === 'delivery' && !deliveryAddress.trim()) ||
    isSubmitting;

  const totalLabel = formatPrice(total, i18n.language);
  const titleId = 'cart-title';

  return (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open} inert={!open}>
      <div
        className={`absolute inset-0 bg-char/40 backdrop-blur-[2px] transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-x-0 bottom-0 flex max-h-[92svh] flex-col rounded-t-[2rem] bg-cream text-ink shadow-2xl transition-transform duration-500 ease-[var(--ease-out-expo)]
          lg:inset-y-0 lg:bottom-auto lg:h-full lg:max-h-none lg:w-[440px] lg:rounded-none lg:ltr:left-auto lg:ltr:right-0 lg:rtl:left-0 lg:rtl:right-auto
          ${open ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-y-0 lg:ltr:translate-x-full lg:rtl:-translate-x-full'}`}
      >
        {/* Handle (mobile) */}
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-1 lg:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        >
          <span className="h-1.5 w-12 rounded-full bg-ink/20" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-6 pb-4 pt-2 lg:pt-6">
          <div className="flex items-center gap-2">
            {step === 'details' && (
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="-ms-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5"
                aria-label={t('order.back')}
              >
                <ArrowLeft size={18} strokeWidth={1.75} className="rtl:rotate-180" aria-hidden="true" />
              </button>
            )}
            <div>
              <h2 id={titleId} className="font-display text-2xl">
                {t('order.your_order')}
              </h2>
              {step !== 'success' && count > 0 && (
                <p className="text-sm text-muted">
                  {count === 1 ? t('order.item_one') : t('order.items', { n: count })}
                  {' · '}
                  {step === 'cart' ? t('order.step_review') : t('order.step_details')}
                </p>
              )}
            </div>
          </div>
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-paper ring-1 ring-line transition-colors hover:bg-ink hover:text-paper"
            aria-label={t('order.close')}
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6" data-lenis-prevent>
          {step === 'success' && (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-olive text-paper motion-safe:animate-[fadeIn_0.6s_var(--ease-out-expo)]">
                <Check size={34} strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="mt-6 font-display text-3xl">{t('order.success_title')}</h3>
              <p className="mt-3 max-w-xs text-ink-soft">{t('order.success_text')}</p>
              <button type="button" onClick={onClose} className="btn btn-dark mt-8">
                {t('order.new_order')}
              </button>
            </div>
          )}

          {step === 'cart' &&
            (cart.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper text-muted ring-1 ring-line">
                  <ShoppingBag size={26} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-2xl">{t('order.empty_cart')}</h3>
                <p className="mt-2 max-w-xs text-sm text-ink-soft">{t('order.empty_cart_text')}</p>
                <button type="button" onClick={onClose} className="btn btn-dark mt-6">
                  {t('order.browse')}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {cart.map((item) => (
                  <CartLine key={item.id} item={item} onQuantity={onQuantity} />
                ))}
              </ul>
            ))}

          {step === 'details' && (
            <div className="space-y-6 pb-6">
              <fieldset>
                <legend className="mb-3 font-medium">{t('order.order_type')}</legend>
                <div className="grid grid-cols-2 gap-3" role="radiogroup">
                  {ORDER_TYPES.map((option) => {
                    const { id, Icon, title, desc } = option;
                    const selected = clientType === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setClientType(id)}
                        className={`flex flex-col items-start gap-3 rounded-2xl p-4 text-start transition-all duration-300 ${
                          selected ? 'bg-ink text-paper shadow-lg' : 'bg-paper ring-1 ring-line hover:ring-ink/40'
                        }`}
                      >
                        <Icon size={22} strokeWidth={1.5} aria-hidden="true" className={selected ? 'text-saffron' : 'text-paprika'} />
                        <span>
                          <span className="block font-semibold">{t(title)}</span>
                          <span className={`mt-0.5 block text-xs leading-snug ${selected ? 'text-paper/70' : 'text-muted'}`}>{t(desc)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {clientType === 'dine-in' && (
                <div>
                  <label htmlFor="table-number" className="mb-2 block text-sm font-medium">
                    {t('customer.table_number')}
                  </label>
                  <input
                    id="table-number"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    placeholder={t('customer.enter_table_number')}
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className={`${field} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  />
                </div>
              )}

              {clientType === 'delivery' && (
                <>
                  <div>
                    <label htmlFor="delivery-address" className="mb-2 block text-sm font-medium">
                      {t('customer.delivery_address')} *
                    </label>
                    <textarea
                      id="delivery-address"
                      rows="3"
                      autoComplete="street-address"
                      placeholder={t('customer.delivery_address_placeholder')}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className={`${field} resize-none`}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone-number" className="mb-2 block text-sm font-medium">
                      {t('order.phone_optional')}
                    </label>
                    <input
                      id="phone-number"
                      type="tel"
                      autoComplete="tel"
                      dir="ltr"
                      placeholder={t('customer.phone_number_placeholder')}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={`${field} rtl:text-right`}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && cart.length > 0 && (
          <div className="shrink-0 border-t border-line bg-paper/70 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-soft">
                <dt>{t('order.subtotal')}</dt>
                <dd className="tabular-nums">
                  {totalLabel} {t('currency')}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="font-medium">{t('order.total')}</dt>
                <dd className="font-display text-2xl tabular-nums">
                  {totalLabel} <span className="font-sans text-sm text-muted">{t('currency')}</span>
                </dd>
              </div>
            </dl>

            {formError && (
              <p role="alert" className="mt-4 rounded-2xl bg-paprika-soft px-4 py-3 text-sm text-paprika-deep">
                {formError}
              </p>
            )}

            {step === 'cart' ? (
              <button type="button" onClick={() => setStep('details')} className="btn btn-primary mt-5 w-full">
                {t('order.continue')}
              </button>
            ) : (
              <button type="button" onClick={onPlaceOrder} disabled={placeDisabled} className="btn btn-primary mt-5 w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    {t('order.placing')}
                  </>
                ) : (
                  <>
                    {t('order.place')} · {totalLabel} {t('currency')}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
