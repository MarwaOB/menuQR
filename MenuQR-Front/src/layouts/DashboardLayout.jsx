import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BookOpen, ReceiptText, ChartNoAxesColumn, Settings, LogOut, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI } from '../utils/api';
import LanguageToggle from '../components/common/LanguageToggle';
import site from '../data/site';

const NAV = [
  { to: '/menus', label: 'menus', icon: BookOpen },
  { to: '/orders', label: 'orders', icon: ReceiptText },
  { to: '/analytics', label: 'analytics', icon: ChartNoAxesColumn },
  { to: '/settings', label: 'settings', icon: Settings },
];

const TOP_LEVEL = NAV.map((n) => n.to);

function useRestaurantName(user) {
  const [name, setName] = useState('');
  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    restaurantAPI
      .getProfile()
      .then((data) => alive && setName(data?.name || ''))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);
  return name;
}

function NavItem({ to, label, icon, compact = false }) {
  const { t } = useTranslation();
  const Icon = icon;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-full text-sm font-medium transition-colors duration-200 ${
          compact ? 'h-10 shrink-0 px-4' : 'h-11 px-4'
        } ${isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" className={isActive ? 'text-saffron' : ''} />
          <span>{t(label)}</span>
        </>
      )}
    </NavLink>
  );
}

const DashboardLayout = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const restaurantName = useRestaurantName(user);
  const isRTL = i18n.dir() === 'rtl';
  const displayName = restaurantName || site.name;
  const isTopLevel = TOP_LEVEL.includes(pathname.replace(/\/$/, ''));

  const handleLogout = () => {
    if (window.confirm(t('dashboard.logout_confirm'))) logout();
  };

  // Each route change lands at the top, like a page load.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="admin min-h-svh">
      <a
        href="#dashboard-main"
        className="btn btn-dark btn-sm fixed start-4 top-4 z-[70] -translate-y-24 focus:translate-y-0"
      >
        {t('dashboard.skip')}
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-line bg-paper lg:flex">
        <div className="px-6 pb-6 pt-7">
          <Link to="/menus" className="font-display text-2xl italic tracking-tight">
            {site.name}
          </Link>
          <p className="eyebrow mt-2 text-muted">{t('dashboard.console')}</p>
        </div>

        <nav aria-label={t('dashboard.nav_label')} className="flex-1 px-3">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavItem {...item} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3 border-t border-line p-4">
          <div className="flex items-center gap-3 px-2">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paprika-soft font-display text-lg text-paprika-deep"
              aria-hidden="true"
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              {user?.email && (
                <p className="truncate text-xs text-muted" title={user.email}>
                  <span className="sr-only">{t('dashboard.signed_in_as')} </span>
                  {user.email}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <Link
              to="/"
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {t('dashboard.view_site')}
              <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="ms-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label={t('logout')}
              title={t('logout')}
            >
              <LogOut size={18} strokeWidth={1.75} className="rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile / tablet header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/menus" className="min-w-0 truncate font-display text-xl italic tracking-tight">
            {site.name}
          </Link>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label={t('logout')}
            >
              <LogOut size={18} strokeWidth={1.75} className="rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </div>
        </div>
        <nav aria-label={t('dashboard.nav_label')} className="no-scrollbar overflow-x-auto px-3 pb-3 sm:px-5">
          <ul className="flex gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavItem {...item} compact />
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="dashboard-main" tabIndex={-1} className="outline-none lg:ps-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
          {isTopLevel ? (
            <Outlet />
          ) : (
            // Menu builder / details screens keep their own headings; give them a sheet.
            <div className="panel p-5 sm:p-8">
              <Outlet />
            </div>
          )}
        </div>
      </main>

      <ToastContainer
        position={isRTL ? 'bottom-left' : 'bottom-right'}
        rtl={isRTL}
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeButton
        pauseOnFocusLoss={false}
        theme="light"
      />
    </div>
  );
};

export default DashboardLayout;
