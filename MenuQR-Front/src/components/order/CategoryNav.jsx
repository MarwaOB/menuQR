import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Sticky, horizontally scrollable section chips. The active chip (scroll-spy)
 * gets a sliding ink pill and is kept in view inside the bar.
 */
export default function CategoryNav({ sections, active, onSelect }) {
  const { t } = useTranslation();
  const bar = useRef(null);
  const pill = useRef(null);

  useEffect(() => {
    const container = bar.current;
    const el = container?.querySelector(`[data-chip="${active}"]`);
    if (!el || !pill.current) return;
    pill.current.style.width = `${el.offsetWidth}px`;
    pill.current.style.transform = `translateX(${el.offsetLeft}px)`;
    pill.current.style.opacity = '1';
    const target = el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;
    container.scrollTo({ left: target, behavior: 'smooth' });
  }, [active, sections]);

  if (!sections.length) return null;

  return (
    <nav aria-label={t('order.categories')} className="relative">
      <div ref={bar} className="no-scrollbar relative flex gap-1 overflow-x-auto py-3" dir="ltr">
        <span
          ref={pill}
          aria-hidden="true"
          className="pointer-events-none absolute top-3 left-0 h-10 rounded-full bg-ink opacity-0 transition-[transform,width,opacity] duration-500 ease-[var(--ease-out-expo)]"
        />
        {sections.map((section) => {
          const isActive = active === section.id;
          return (
            <button
              key={section.id}
              type="button"
              data-chip={section.id}
              onClick={() => onSelect(section.id)}
              aria-current={isActive ? 'true' : undefined}
              dir="auto"
              className={`relative z-10 flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-300 ${
                isActive ? 'text-paper' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {section.name}
              <span className={`text-xs tabular-nums ${isActive ? 'text-paper/60' : 'text-muted'}`}>{section.dishes.length}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
