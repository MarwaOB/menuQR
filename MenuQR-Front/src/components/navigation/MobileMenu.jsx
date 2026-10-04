import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import LanguageToggle from '../common/LanguageToggle';
import Arrow from '../common/Arrow';
import site from '../../data/site';

/**
 * Fullscreen menu: the panel wipes down, links rise in sequence.
 * Traps focus while open and closes on Escape.
 */
export default function MobileMenu({ open, onClose, links, active, onNavigate }) {
  const { t } = useTranslation();
  const panel = useRef(null);
  const closeBtn = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    closeBtn.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = panel.current.querySelectorAll('a[href], button:not([disabled])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div
      ref={panel}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label={t('home.nav.main')}
      aria-hidden={!open}
      inert={!open}
      className="fixed inset-0 z-[70] flex flex-col bg-paprika text-paper lg:hidden"
      style={{
        clipPath: open ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
        transition: 'clip-path 0.8s var(--ease-in-out-quart)',
      }}
    >
      <div className="flex h-[var(--header-h)] items-center justify-between px-5">
        <span className="font-display text-2xl italic">{site.name}</span>
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-paper/30"
          aria-label={t('home.nav.close_menu')}
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col justify-center px-6" aria-label={t('home.nav.main')}>
        <ul className="space-y-1">
          {links.map((link, i) => (
            <li key={link.id} className="overflow-hidden">
              <a
                href={`#${link.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(link.id);
                }}
                aria-current={active === link.id ? 'true' : undefined}
                className="group flex items-baseline gap-4 py-1.5"
                style={{
                  transform: open ? 'translateY(0)' : 'translateY(110%)',
                  transition: `transform 0.9s var(--ease-out-expo) ${open ? 0.25 + i * 0.06 : 0}s`,
                }}
              >
                <span className="w-6 text-xs tabular-nums opacity-60">0{i + 1}</span>
                <span className="font-display text-[2.6rem] leading-tight sm:text-6xl">
                  {t(link.label)}
                </span>
                {active === link.id && <span className="h-2 w-2 rounded-full bg-saffron" aria-hidden="true" />}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div
        className="space-y-5 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]"
        style={{ opacity: open ? 1 : 0, transition: `opacity 0.6s ease ${open ? 0.6 : 0}s` }}
      >
        <Link to="/menu/order" className="btn btn-light w-full" onClick={onClose}>
          <span>{t('home.nav.order')}</span>
          <Arrow />
        </Link>
        <div className="flex items-center justify-between text-sm text-paper/80">
          <span>{site.contact.phone || t('home.footer.tagline')}</span>
          <LanguageToggle className="border border-paper/30 hover:bg-paper/10" />
        </div>
      </div>
    </div>
  );
}
