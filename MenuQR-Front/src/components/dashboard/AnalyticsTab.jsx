import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ArrowUpRight, ArrowDownRight, Minus, RotateCcw, CalendarDays } from 'lucide-react';
import { statisticsAPI } from '../../utils/api';
import { formatPrice } from '../../lib/format';
import PageHeader from './PageHeader';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// Chart ink follows the house tokens (see index.css @theme).
const INK = '#1b1611';
const MUTED = '#6b5e50';
const PAPER = '#fbf7f0';
const PAPRIKA = '#b5401f';
const GRID = 'rgba(27, 22, 17, 0.08)';

const PRESETS = [7, 30, 90];

// Status: colour is a secondary cue only; every row carries its label, count and share.
const STATUS_ROWS = [
  { key: 'pending', field: 'pending_orders', bar: 'bg-saffron' },
  { key: 'served', field: 'served_orders', bar: 'bg-olive' },
  { key: 'cancelled', field: 'cancelled_orders', bar: 'bg-danger' },
];

const daysAgo = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

// Local calendar date (toISOString would shift to UTC and can land on the wrong day).
const toApiDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function StatTile({ label, value, change }) {
  const { t } = useTranslation();
  const n = Number(change) || 0;
  const Icon = n > 0 ? ArrowUpRight : n < 0 ? ArrowDownRight : Minus;
  const tone = n > 0 ? 'bg-olive/12 text-olive-deep' : n < 0 ? 'bg-danger/10 text-danger' : 'bg-ink/5 text-muted';
  return (
    <div className="panel flex flex-col justify-between gap-6 p-5">
      <p className="eyebrow text-muted">{label}</p>
      <div>
        <p className="whitespace-nowrap font-display text-[clamp(1.75rem,2.4vw,2.25rem)] font-light leading-none tabular">{value}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className={`badge ${tone}`}>
            <Icon size={13} strokeWidth={2} aria-hidden="true" />
            {n === 0 ? t('analytics_page.no_change') : `${Math.abs(n).toFixed(1)}%`}
          </span>
          {n !== 0 && t('dashboard.analytics.vs_previous')}
        </p>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel space-y-6 p-5">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-9 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="skeleton h-80 rounded-[1.25rem] lg:col-span-2" />
        <div className="skeleton h-80 rounded-[1.25rem]" />
      </div>
    </div>
  );
}

const AnalyticsTab = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const isRTL = lang === 'ar';
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [refetching, setRefetching] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: daysAgo(30), endDate: new Date() });
  const [orderStats, setOrderStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    served_orders: 0,
    cancelled_orders: 0,
    internal_orders: 0,
    external_orders: 0,
    changes: { total_orders: 0, internal_orders: 0, external_orders: 0 },
  });
  const [popularDishes, setPopularDishes] = useState([]);
  const [revenueData, setRevenueData] = useState({ daily_data: [], total_revenue: 0, revenue_change: 0 });

  const money = useCallback((v) => `${formatPrice(Number(v) || 0, lang)} ${t('currency')}`, [lang, t]);
  const count = useCallback((v) => new Intl.NumberFormat(lang === 'ar' ? 'ar-DZ' : 'en-US').format(Number(v) || 0), [lang]);

  const fetchAnalytics = useCallback(async () => {
    setRefetching(true);
    try {
      const params = { start_date: toApiDate(dateRange.startDate), end_date: toApiDate(dateRange.endDate) };
      const [stats, dishes, revenue] = await Promise.all([
        statisticsAPI.getOrderAnalytics(params),
        statisticsAPI.getPopularDishes(10),
        statisticsAPI.getRevenue(params),
      ]);
      setOrderStats((prev) => ({ ...prev, ...stats }));
      setPopularDishes(Array.isArray(dishes) ? dishes : []);
      setRevenueData({
        // The API returns newest first; a time axis reads oldest → newest.
        daily_data: Array.isArray(revenue?.daily_data)
          ? [...revenue.daily_data].sort((a, b) => new Date(a.order_date) - new Date(b.order_date))
          : [],
        total_revenue: revenue?.total_revenue || 0,
        revenue_change: revenue?.revenue_change || 0,
      });
      setStatus('ready');
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setStatus('error');
    } finally {
      setRefetching(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const activePreset = useMemo(() => {
    const today = toApiDate(new Date());
    if (toApiDate(dateRange.endDate) !== today) return null;
    return PRESETS.find((n) => toApiDate(daysAgo(n)) === toApiDate(dateRange.startDate)) ?? null;
  }, [dateRange]);

  const daily = revenueData.daily_data;
  const dayLabel = (d) =>
    new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-GB', { day: 'numeric', month: 'short' });

  const revenueChart = useMemo(
    () => ({
      labels: daily.map((item) => dayLabel(item.order_date)),
      datasets: [
        {
          label: t('analytics_page.revenue'),
          data: daily.map((item) => Number(item.daily_revenue) || 0),
          borderColor: PAPRIKA,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: daily.length === 1 ? 4 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: PAPRIKA,
          pointHoverBorderColor: PAPER,
          pointHoverBorderWidth: 2,
          fill: 'origin',
          backgroundColor: (ctx) => {
            const { chart } = ctx;
            if (!chart.chartArea) return 'rgba(181, 64, 31, 0.08)';
            const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
            g.addColorStop(0, 'rgba(181, 64, 31, 0.18)');
            g.addColorStop(1, 'rgba(181, 64, 31, 0)');
            return g;
          },
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dayLabel only depends on lang
    [daily, lang, t]
  );

  const revenueOptions = useMemo(() => {
    // Use the page's own (already loaded) font stack so canvas measurements match what is drawn.
    const family = getComputedStyle(document.body).fontFamily;
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: isRTL,
          backgroundColor: INK,
          titleColor: PAPER,
          bodyColor: PAPER,
          padding: 10,
          cornerRadius: 10,
          displayColors: false,
          titleFont: { family, weight: '600' },
          bodyFont: { family },
          callbacks: { label: (item) => money(item.parsed.y) },
        },
      },
      scales: {
        x: {
          reverse: isRTL,
          grid: { display: false },
          border: { color: GRID },
          ticks: { color: MUTED, font: { family, size: 11 }, maxRotation: 0, autoSkipPadding: 16 },
        },
        y: {
          position: isRTL ? 'right' : 'left',
          beginAtZero: true,
          grid: { color: GRID },
          border: { display: false },
          ticks: { color: MUTED, font: { family, size: 11 }, maxTicksLimit: 5, callback: (v) => formatPrice(v, lang) },
        },
      },
    };
  }, [isRTL, lang, money]);

  const statusTotal = STATUS_ROWS.reduce((s, r) => s + (Number(orderStats[r.field]) || 0), 0);
  const maxOrdered = Math.max(1, ...popularDishes.map((d) => Number(d.times_ordered) || 0));

  const rangeControls = (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label={t('dashboard.analytics.range_label')} className="flex rounded-full border border-line bg-paper p-1">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={activePreset === n}
            onClick={() => setDateRange({ startDate: daysAgo(n), endDate: new Date() })}
            className={`h-8 rounded-full px-3 text-xs font-semibold transition-colors duration-200 ${
              activePreset === n ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t(`dashboard.analytics.preset_${n}`)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <CalendarDays size={16} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
        <div className="w-32">
          <DatePicker
            selected={dateRange.startDate}
            onChange={(date) => date && setDateRange((r) => ({ ...r, startDate: date }))}
            selectsStart
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            maxDate={dateRange.endDate}
            className="field !min-h-10 !py-1.5 text-sm"
            ariaLabelledBy="range-from"
          />
        </div>
        <span id="range-from" className="sr-only">{t('dashboard.analytics.from')}</span>
        <span className="text-muted" aria-hidden="true">–</span>
        <div className="w-32">
          <DatePicker
            selected={dateRange.endDate}
            onChange={(date) => date && setDateRange((r) => ({ ...r, endDate: date }))}
            selectsEnd
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            minDate={dateRange.startDate}
            maxDate={new Date()}
            className="field !min-h-10 !py-1.5 text-sm"
            ariaLabelledBy="range-to"
          />
        </div>
        <span id="range-to" className="sr-only">{t('dashboard.analytics.to')}</span>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader page="analytics" actions={rangeControls} />

      {status === 'loading' && (
        <>
          <span className="sr-only" role="status">{t('common.loading')}</span>
          <AnalyticsSkeleton />
        </>
      )}

      {status === 'error' && (
        <div className="panel flex flex-col items-start gap-4 p-8" role="alert">
          <p className="font-display text-2xl">{t('analytics_page.error_fetching_analytics', t('common.error'))}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchAnalytics}>
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
            {t('dashboard.retry')}
          </button>
        </div>
      )}

      {status === 'ready' && (
        <div className={`space-y-6 transition-opacity duration-300 ${refetching ? 'opacity-60' : ''}`} aria-busy={refetching}>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label={t('analytics_page.total_revenue')}
              value={money(revenueData.total_revenue)}
              change={revenueData.revenue_change}
            />
            <StatTile
              label={t('analytics_page.total_orders')}
              value={count(orderStats.total_orders)}
              change={orderStats.changes?.total_orders}
            />
            <StatTile
              label={t('analytics_page.internal_orders')}
              value={count(orderStats.internal_orders)}
              change={orderStats.changes?.internal_orders}
            />
            <StatTile
              label={t('analytics_page.external_orders')}
              value={count(orderStats.external_orders)}
              change={orderStats.changes?.external_orders}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Revenue over time */}
            <section className="panel p-5 sm:p-6 lg:col-span-2" aria-labelledby="revenue-title">
              <h2 id="revenue-title" className="text-2xl">{t('analytics_page.revenue_over_time')}</h2>
              {daily.length > 0 ? (
                <>
                              <div className="mt-5 h-64 sm:h-72">
                    <Line
                      data={revenueChart}
                      options={revenueOptions}
                      aria-label={t('analytics_page.revenue_over_time')}
                      role="img"
                    />
                  </div>
                  <details className="mt-4 text-sm">
                    <summary className="cursor-pointer text-muted hover:text-ink">{t('dashboard.analytics.table_view')}</summary>
                    <div className="mt-3 max-h-60 overflow-y-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>{t('dashboard.analytics.date')}</th>
                            <th className="!text-end">{t('analytics_page.revenue')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {daily.map((item) => (
                            <tr key={item.order_date}>
                              <td>{dayLabel(item.order_date)}</td>
                              <td className="text-end tabular">{money(item.daily_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              ) : (
                <p className="mt-10 pb-10 text-center text-muted">{t('dashboard.analytics.no_revenue')}</p>
              )}
            </section>

            {/* Order status */}
            <section className="panel p-5 sm:p-6" aria-labelledby="status-title">
              <h2 id="status-title" className="text-2xl">{t('analytics_page.order_status')}</h2>
              <ul className="mt-6 space-y-5">
                {STATUS_ROWS.map(({ key, field, bar }) => {
                  const value = Number(orderStats[field]) || 0;
                  const pct = statusTotal ? Math.round((value / statusTotal) * 100) : 0;
                  return (
                    <li key={key}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium">{t(`analytics_page.${key}`)}</span>
                        <span className="flex items-baseline gap-2 tabular">
                          <span className="font-semibold">{count(value)}</span>
                          <span className="text-muted">{pct}%</span>
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden="true">
                        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
                {t('analytics_page.total_orders')}
                <span className="ms-2 font-semibold text-ink tabular">{count(statusTotal)}</span>
              </p>
            </section>
          </div>

          {/* Popular dishes */}
          <section className="panel overflow-hidden" aria-labelledby="dishes-title">
            <h2 id="dishes-title" className="px-5 pt-5 text-2xl sm:px-6 sm:pt-6">{t('analytics_page.popular_dishes')}</h2>
            {popularDishes.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-10">{t('dashboard.analytics.rank')}</th>
                      <th>{t('analytics_page.dish')}</th>
                      <th className="hidden md:table-cell">{t('analytics_page.section')}</th>
                      <th className="!text-end">{t('analytics_page.price')}</th>
                      <th className="min-w-40">{t('analytics_page.times_ordered')}</th>
                      <th className="!text-end">{t('analytics_page.total_quantity')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularDishes.map((dish, i) => {
                      const times = Number(dish.times_ordered) || 0;
                      return (
                        <tr key={dish.id ?? i}>
                          <td className="font-display text-lg italic text-paprika tabular">{i + 1}</td>
                          <td>
                            <span className="font-medium">{dish.name}</span>
                            {dish.menu_name && <span className="block text-xs text-muted">{dish.menu_name}</span>}
                          </td>
                          <td className="hidden text-ink-soft md:table-cell">
                            {dish.section_name ? t(dish.section_name.toLowerCase()) : '—'}
                          </td>
                          <td className="whitespace-nowrap text-end tabular">{money(dish.price)}</td>
                          <td>
                            <div className="flex items-center gap-3">
                              <span className="w-8 shrink-0 text-end font-semibold tabular">{count(times)}</span>
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden="true">
                                <span
                                  className="block h-full rounded-full bg-paprika"
                                  style={{ width: `${(times / maxOrdered) * 100}%` }}
                                />
                              </span>
                            </div>
                          </td>
                          <td className="text-end tabular">{count(dish.total_ordered)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 pb-10 pt-6 text-center text-muted">{t('dashboard.analytics.no_dishes')}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
