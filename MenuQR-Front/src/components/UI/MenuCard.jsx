'use client';

import { useTranslation } from 'react-i18next';
import { BookOpen, Trash2 } from 'lucide-react';
import Arrow from '../common/Arrow';

/** One row in the menus list: the whole row opens the menu; delete is separate. */
const MenuCard = ({ name, date, onSeeMore, onDelete, latest = false }) => {
  const { t, i18n } = useTranslation();

  const formatted = date
    ? new Date(date).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="group relative flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-cream/60 sm:px-6">
      <span
        className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-full sm:flex ${
          latest ? 'bg-paprika text-paper' : 'border border-line text-paprika'
        }`}
        aria-hidden="true"
      >
        <BookOpen size={18} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          <button
            type="button"
            onClick={onSeeMore}
            className="text-start after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {t('menu')} #{name}
          </button>
          {latest && <span className="badge bg-paprika-soft text-paprika-deep">{t('dashboard.menus.latest')}</span>}
        </p>
        {formatted && (
          <p className="mt-0.5 text-sm text-muted">
            {t('created_on')} <time dateTime={date}>{formatted}</time>
          </p>
        )}
      </div>

      <span className="hidden items-center gap-2 text-sm font-semibold text-ink-soft group-hover:text-ink sm:inline-flex" aria-hidden="true">
        {t('dashboard.menus.open')}
        <Arrow />
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger"
        aria-label={`${t('delete')} — ${t('menu')} #${name}`}
        title={t('delete')}
      >
        <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
};

export default MenuCard;
