import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import PlateIllustration from '../3d/PlateIllustration';

export function MenuSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6" aria-busy="true">
      <span className="sr-only" role="status">
        {t('loading')}
      </span>
      <div className="skeleton mt-10 h-12 w-64 rounded-full" />
      <div className="mt-6 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-10 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-4 rounded-[1.5rem] bg-paper p-3 sm:block sm:p-0">
            <div className="flex-1 space-y-3 sm:hidden">
              <div className="skeleton h-5 w-3/4 rounded-full" />
              <div className="skeleton h-4 w-full rounded-full" />
              <div className="skeleton mt-6 h-8 w-20 rounded-full" />
            </div>
            <div className="skeleton aspect-square w-28 rounded-2xl sm:aspect-[4/3] sm:w-full sm:rounded-b-none sm:rounded-t-[1.5rem]" />
            <div className="hidden space-y-3 p-5 sm:block">
              <div className="skeleton h-6 w-3/4 rounded-full" />
              <div className="skeleton h-4 w-full rounded-full" />
              <div className="skeleton h-4 w-2/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StateShell({ art, title, text, children }) {
  return (
    <div className="flex min-h-[calc(100svh-var(--header-h))] items-center justify-center px-5 py-16">
      <div className="max-w-md text-center">
        {art}
        <h1 className="mt-8 font-display text-4xl font-light sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-sm leading-relaxed text-ink-soft">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </div>
  );
}

export function LoadErrorState({ message, onRetry, retrying }) {
  const { t } = useTranslation();
  return (
    <StateShell
      art={
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika-soft text-paprika">
          <AlertTriangle size={30} strokeWidth={1.5} aria-hidden="true" />
        </span>
      }
      title={t('order.error_title')}
      text={message || t('order.error_load')}
    >
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className="btn btn-primary">
          {retrying ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
          {t('order.retry')}
        </button>
      )}
      <Link to="/" className="btn btn-ghost">
        {t('order.back_home')}
      </Link>
    </StateShell>
  );
}

export function NoMenuState({ onRefresh }) {
  const { t } = useTranslation();
  return (
    <StateShell art={<PlateIllustration className="mx-auto w-44 opacity-90" />} title={t('order.no_menu_title')} text={t('order.no_menu_text')}>
      <button type="button" onClick={onRefresh} className="btn btn-primary">
        <RotateCcw size={16} aria-hidden="true" />
        {t('order.refresh')}
      </button>
      <Link to="/" className="btn btn-ghost">
        {t('order.back_home')}
      </Link>
    </StateShell>
  );
}

export function EmptyMenuState() {
  const { t } = useTranslation();
  return (
    <div className="py-20 text-center">
      <PlateIllustration className="mx-auto w-36 opacity-80" />
      <h2 className="mt-6 font-display text-3xl font-light">{t('order.empty_menu_title')}</h2>
      <p className="mt-3 text-ink-soft">{t('order.empty_menu_text')}</p>
    </div>
  );
}
