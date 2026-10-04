import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MobileMenu from './MobileMenu';
import LanguageToggle from '../common/LanguageToggle';
import MagneticLink from '../common/MagneticLink';
import { scrollToTarget, startScroll, stopScroll } from '../../animation/smoothScroll';
import site from '../../data/site';

const HOME_LINKS = [
  { id: 'top', label: 'home.nav.home' },
  { id: 'menu', label: 'home.nav.menu' },
  { id: 'story', label: 'home.nav.about' },
  { id: 'experience', label: 'home.nav.gallery' },
  { id: 'visit', label: 'home.nav.contact' },
];

function readCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('customerCart') || '[]');
    return cart.reduce((n, item) => n + (parseInt(item.quantity) || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Home navigation. Transparent over the hero, then a blurred paper bar.
 * `tone="dark"` flips colours while a dark section sits underneath.
 */
export default function Navbar({ tone = 'light' }) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('top');
  const [cartCount] = useState(readCartCount);

  // Solid background after leaving the top; hide while scrolling down, reveal on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        setHidden(y > 480 && y > last + 4);
        if (y < last - 4 || y < 480) setHidden(false);
        last = y;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Scroll-spy for the active link.
  useEffect(() => {
    const sections = HOME_LINKS.map((l) => document.getElementById(l.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id));
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (open) {
      stopScroll();
      document.body.style.overflow = 'hidden';
    } else {
      startScroll();
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const navigate = useCallback((id) => {
    setOpen(false);
    scrollToTarget(id === 'top' ? 0 : `#${id}`);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const dark = tone === 'dark' && !open;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,box-shadow] duration-500 ease-[var(--ease-out-expo)] ${
          hidden && !open ? '-translate-y-full' : 'translate-y-0'
        } ${
          scrolled
            ? dark
              ? 'bg-char/70 text-paper shadow-[0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl'
              : 'bg-paper/75 text-ink shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl'
            : dark
              ? 'text-paper'
              : 'text-ink'
        }`}
      >
        <div className="mx-auto flex h-[var(--header-h)] max-w-[90rem] items-center justify-between gap-6 px-5 sm:px-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              navigate('top');
            }}
            className="font-display text-2xl italic tracking-tight"
          >
            {site.name}
          </a>

          <nav aria-label={t('home.nav.main')} className="hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full p-1">
              {HOME_LINKS.map((link) => {
                const isActive = active === link.id;
                return (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(link.id);
                      }}
                      aria-current={isActive ? 'true' : undefined}
                      className="relative block px-4 py-2 text-sm font-medium"
                    >
                      <span className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}>
                        {t(link.label)}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-4 -bottom-0.5 h-px origin-left bg-current transition-transform duration-500 ease-[var(--ease-out-expo)] rtl:origin-right ${
                          isActive ? 'scale-x-100' : 'scale-x-0'
                        }`}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle className={dark ? 'hover:bg-paper/10' : ''} />
            <MagneticLink to="/menu/order" variant={dark ? 'light' : 'primary'} className="hidden !min-h-11 sm:inline-flex">
              {t('home.nav.order')}
              {cartCount > 0 && (
                <span className="ms-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-paper px-1 text-[0.7rem] text-paprika">
                  {cartCount}
                </span>
              )}
            </MagneticLink>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full border border-current/25 lg:hidden"
              aria-label={t('home.nav.open_menu')}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <span className="block h-px w-5 bg-current" />
              <span className="block h-px w-3.5 bg-current" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={open} onClose={close} links={HOME_LINKS} active={active} onNavigate={navigate} />

      {/* Mobile: persistent order button once the hero is gone */}
      <Link
        to="/menu/order"
        className={`btn btn-primary fixed inset-x-5 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 shadow-[0_18px_40px_-16px_rgb(142_47_20/0.7)] transition-all duration-500 sm:hidden ${
          scrolled && !open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'
        }`}
        tabIndex={scrolled ? undefined : -1}
      >
        {t('home.nav.order')}
        {cartCount > 0 ? ` · ${cartCount}` : ''}
      </Link>
    </>
  );
}
