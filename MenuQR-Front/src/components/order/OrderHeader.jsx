import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, ShoppingBag, X } from 'lucide-react';
import LanguageToggle from '../common/LanguageToggle';
import { formatPrice } from '../../lib/format';
import site from '../../data/site';

function SearchField({ value, onChange, className = '' }) {
  const { t } = useTranslation();
  return (
    <div className={`relative ${className}`}>
      <label htmlFor="menu-search" className="sr-only">
        {t('order.search_label')}
      </label>
      <Search size={17} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ltr:left-4 rtl:right-4" aria-hidden="true" />
      <input
        id="menu-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('order.search')}
        autoComplete="off"
        className="h-11 w-full rounded-full border border-line bg-paper px-11 text-sm text-ink placeholder:text-muted transition-shadow focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink ltr:right-1.5 rtl:left-1.5"
          aria-label={t('order.clear_search')}
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function OrderHeader({ query, onQuery, count, total, onOpenCart, bump, showSearch = true, headerRef, children }) {
  const { t, i18n } = useTranslation();
  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-xl">
      {/* One search field: its own row on mobile, centred in the bar from md up. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 px-4 sm:gap-x-6 sm:px-6">
        <Link to="/" className="group flex h-16 shrink-0 items-center gap-2 md:h-[var(--header-h)]" aria-label={`${site.name} — ${t('order.home')}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-line transition-colors group-hover:bg-ink group-hover:text-paper">
            <ArrowLeft size={16} strokeWidth={1.75} className="rtl:rotate-180" aria-hidden="true" />
          </span>
          <span className="font-display text-xl italic">{site.name}</span>
        </Link>

        {showSearch && (
          <SearchField
            value={query}
            onChange={onQuery}
            className="order-last w-full pb-3 md:order-none md:mx-auto md:w-auto md:max-w-md md:flex-1 md:pb-0"
          />
        )}

        <div className={`ms-auto flex items-center gap-1.5 ${showSearch ? "md:ms-0" : ""}`}>
          <LanguageToggle />
          <button
            type="button"
            onClick={onOpenCart}
            className="relative inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper transition-colors hover:bg-paprika"
            aria-label={`${t('order.view_order')} (${count})`}
          >
            <ShoppingBag size={17} strokeWidth={1.75} aria-hidden="true" />
            <span className="hidden tabular-nums sm:inline">
              {count > 0 ? `${formatPrice(total, i18n.language)} ${t('currency')}` : t('order.your_order')}
            </span>
            {count > 0 && (
              <span
                key={bump}
                className="absolute -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-paprika px-1 text-[0.7rem] text-paper ring-2 ring-cream motion-safe:animate-[fadeIn_0.4s_var(--ease-out-expo)] ltr:-right-1 rtl:-left-1"
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
      {children && <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>}
    </header>
  );
}
