import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  Search,
  RotateCw,
  Printer,
  Check,
  X,
  Truck,
  Armchair,
  User,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Trash2,
  Inbox,
} from 'lucide-react';
import { orderAPI } from '../../utils/api';
import { formatPrice } from '../../lib/format';
import Modal from '../UI/Modal';
import PageHeader from './PageHeader';

const POLL_MS = 30000;
const STATUSES = ['pending', 'served', 'cancelled'];

// Old statuses map onto the current three.
const STATUS_ALIAS = { ready: 'served', completed: 'served' };

const STATUS_STYLE = {
  pending: 'bg-saffron/20 text-[#7a5310]',
  served: 'bg-olive/12 text-olive-deep',
  cancelled: 'bg-danger/10 text-danger',
};

function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`badge ${STATUS_STYLE[status] || 'bg-ink/5 text-ink-soft'}`}>
      <span className="badge-dot" aria-hidden="true" />
      {STATUSES.includes(status) ? t(`orders_page.status_${status}`) : status}
    </span>
  );
}

function CustomerCell({ order }) {
  const { t } = useTranslation();
  if (order.external_client_id) {
    return (
      <span className="inline-flex items-center gap-2">
        <Truck size={16} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
        {t('orders_page.delivery')}
      </span>
    );
  }
  if (order.table_number) {
    return (
      <span className="inline-flex items-center gap-2">
        <Armchair size={16} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
        {t('orders_page.table')} {order.table_number}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-muted">
      <User size={16} strokeWidth={1.75} aria-hidden="true" />
      {order.customer_name || t('orders_page.guest')}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="panel space-y-4 p-6" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-6">
          <div className="skeleton h-4 w-20 rounded-full" />
          <div className="skeleton h-4 flex-1 rounded-full" />
          <div className="skeleton hidden h-4 w-24 rounded-full sm:block" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function OrdersTab() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const tRef = useRef(t);
  tRef.current = t;

  const money = useCallback((amount) => `${formatPrice(Number(amount) || 0, lang)} ${t('currency')}`, [lang, t]);

  const normalizeItems = (items) =>
    items.map((item) => ({
      ...item,
      name: item.name || item.dish_name || tRef.current('orders_page.unnamed_item'),
      price: Number(item.price || item.unit_price || 0),
      quantity: Number(item.quantity || 1),
    }));

  const normalizeOrder = (order) => {
    if (!order) return null;
    const orderId = order.id || order._id || `order-${Math.random().toString(36).slice(2, 11)}`;
    const rawItems = Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : [];
    const items = normalizeItems(rawItems);

    let total = Number(order.total_amount || order.total || 0);
    if (!total && items.length > 0) {
      total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    const rawStatus = (order.status || 'pending').toLowerCase();
    const createdAt = order.created_at || order.createdAt || new Date().toISOString();

    return {
      ...order,
      id: orderId,
      order_number: order.order_number || `#${String(orderId).substring(0, 8)}`,
      items,
      total_amount: total,
      status: STATUS_ALIAS[rawStatus] || rawStatus,
      customer_name: order.customer_name || (order.customer ? order.customer.name || order.customer.email : null),
      created_at: createdAt,
      updated_at: order.updated_at || order.updatedAt || createdAt,
      table_number: order.table_number || (order.table ? order.table.number : null),
      phone_number: order.phone_number || (order.customer ? order.customer.phone : null),
      notes: order.notes || order.special_instructions,
    };
  };

  const fetchOrderItems = async (orderId) => {
    try {
      const details = await orderAPI.getById(orderId);
      return normalizeItems(details.items || []);
    } catch (error) {
      console.error(`Error fetching items for order ${orderId}:`, error);
      return [];
    }
  };

  // `background` refreshes keep the table on screen instead of flashing a loader.
  const fetchOrders = async ({ background = false } = {}) => {
    if (background) setRefreshing(true);
    try {
      const data = await orderAPI.getAll();
      const withItems = await Promise.all(
        (data || []).map(async (order) => {
          const normalized = normalizeOrder(order);
          if (!normalized) return null;
          if (normalized.items.length === 0) {
            normalized.items = await fetchOrderItems(normalized.id);
            if (!normalized.total_amount && normalized.items.length > 0) {
              normalized.total_amount = normalized.items.reduce((s, i) => s + i.price * i.quantity, 0);
            }
          }
          return normalized;
        })
      );
      setOrders(withItems.filter(Boolean));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error in fetchOrders:', error);
      if (!background) setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchOrders({ background: true });
    }, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll once per mount
  }, []);

  const handleDownloadReceipt = (order) => {
    try {
      const lines = [
        '============================',
        '        ORDER RECEIPT',
        '============================',
        `Order #: ${order.order_number}`,
        `Date: ${new Date(order.created_at).toLocaleString()}`,
        `Status: ${order.status.toUpperCase()}`,
        '----------------------------',
        'ITEMS:',
        ...order.items.flatMap((item) => [
          `${item.quantity}x ${item.name}`,
          `   ${money(item.price * item.quantity)}`,
          ...(item.notes ? [`   Note: ${item.notes}`] : []),
        ]),
        '----------------------------',
        `TOTAL: ${money(order.total_amount)}`,
        '============================',
        t('orders_page.thank_you_for_your_order'),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${order.order_number || order.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error(t('orders_page.error_generating_receipt'));
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!orderId || !window.confirm(t('orders_page.confirm_delete_order'))) return;
    try {
      const response = await orderAPI.delete(orderId);
      if (response && response.error) throw new Error(response.error);
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      toast.success(t('dashboard.orders.deleted'));
    } catch (error) {
      console.error('Error deleting order:', error);
      const message = error.response?.data?.error || error.message || t('orders_page.unknown_error');
      toast.error(`${t('orders_page.error_deleting_order')}: ${message}`);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    if (!orderId) return;
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      const now = new Date().toISOString();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updated_at: now } : o)));
      setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, status: newStatus, updated_at: now } : prev));
      toast.success(t('dashboard.orders.updated', { status: t(`orders_page.status_${newStatus}`) }));
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(t('orders_page.error_updating_status'));
    }
  };

  const counts = useMemo(() => {
    const c = { all: orders.length, pending: 0, served: 0, cancelled: 0 };
    orders.forEach((o) => {
      if (c[o.status] !== undefined) c[o.status] += 1;
    });
    return c;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const matchesSearch =
        !q ||
        String(order.order_number || '').toLowerCase().includes(q) ||
        String(order.customer_name || '').toLowerCase().includes(q) ||
        String(order.table_number || '').includes(q) ||
        String(order.phone_number || '').includes(q);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    const value = (o) => {
      if (sortConfig.key === 'created_at') return new Date(o.created_at).getTime() || 0;
      if (sortConfig.key === 'total_amount') return Number(o.total_amount) || 0;
      return String(o[sortConfig.key] ?? '');
    };
    return filtered.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (typeof va === 'string') return va.localeCompare(vb, undefined, { numeric: true }) * dir;
      return (va - vb) * dir;
    });
  }, [orders, searchTerm, statusFilter, sortConfig]);

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const relativeTime = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return t('orders_page.just_now');
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return t('orders_page.just_now');
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${t('orders_page.ago')}`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${t('orders_page.ago')}`;
    return date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Plain render helpers (not components) so buttons keep focus across re-renders.
  const renderSortHeader = (column, label) => {
    const active = sortConfig.key === column;
    const Icon = !active ? ArrowUpDown : sortConfig.direction === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th aria-sort={active ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          onClick={() => requestSort(column)}
          className={`inline-flex items-center gap-1.5 uppercase transition-colors hover:text-ink ${active ? 'text-ink' : ''}`}
        >
          {label}
          <Icon size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      </th>
    );
  };

  const renderRowActions = (order) => (
    <div className="flex items-center justify-end gap-1">
      {order.status === 'pending' && (
        <button
          type="button"
          onClick={() => handleStatusUpdate(order.id, 'served')}
          className="inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-full text-olive transition-colors hover:bg-olive/10"
          aria-label={`${t('orders_page.mark_complete')} — ${order.order_number}`}
          title={t('orders_page.mark_complete')}
        >
          <Check size={17} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={() => handleDownloadReceipt(order)}
        className="inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink"
        aria-label={`${t('orders_page.print_receipt')} — ${order.order_number}`}
        title={t('orders_page.print_receipt')}
      >
        <Printer size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => setSelectedOrder(order)} className="btn btn-quiet btn-sm !min-h-11 md:!min-h-9 !px-3">
        {t('orders_page.view')}
      </button>
    </div>
  );

  const renderItemsSummary = (order) =>
    order.items.length > 0 ? (
      <>
        {order.items.slice(0, 2).map((item, idx) => (
          <span key={idx} className="block">
            <span className="tabular text-muted">{item.quantity}×</span> {item.name}
          </span>
        ))}
        {order.items.length > 2 && (
          <span className="block text-sm text-paprika">
            {t('dashboard.orders.more_items', { count: order.items.length - 2 })}
          </span>
        )}
      </>
    ) : (
      <span className="text-muted">{t('orders_page.no_items')}</span>
    );

  return (
    <div>
      <PageHeader
        page="orders"
        meta={!loading ? t('dashboard.orders.count', { count: orders.length }) : null}
        actions={
          <>
            {lastUpdated && (
              <span className="text-xs text-muted tabular">
                {t('dashboard.updated_at', {
                  time: lastUpdated.toLocaleTimeString(lang === 'ar' ? 'ar-DZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' }),
                })}
              </span>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fetchOrders({ background: true })}
              disabled={refreshing || loading}
            >
              <RotateCw size={15} strokeWidth={1.75} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
              {t('dashboard.refresh')}
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label={t('dashboard.orders.filter_label')} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
          {['all', ...STATUSES].map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                aria-pressed={active}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
                  active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink-soft hover:border-ink/30 hover:text-ink'
                }`}
              >
                {s === 'all' ? t('orders_page.all_status') : t(`orders_page.status_${s}`)}
                <span className={`tabular text-xs ${active ? 'text-paper/70' : 'text-muted'}`}>{counts[s]}</span>
              </button>
            );
          })}
        </div>
        <div className="relative md:w-72">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder={t('orders_page.search_placeholder')}
            aria-label={t('orders_page.search_placeholder')}
            className="field ps-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <>
          <span className="sr-only" role="status">{t('common.loading')}</span>
          <TableSkeleton />
        </>
      ) : visibleOrders.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-muted" aria-hidden="true">
            <Inbox size={22} strokeWidth={1.5} />
          </span>
          <p className="font-display text-2xl">{t('orders_page.no_orders_found')}</p>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: table */}
          <div className="panel hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {renderSortHeader('order_number', t('orders_page.order_number'))}
                    <th>{t('orders_page.items')}</th>
                    <th>{t('orders_page.customer')}</th>
                    {renderSortHeader('total_amount', t('orders_page.total'))}
                    {renderSortHeader('created_at', t('orders_page.time'))}
                    <th>{t('orders_page.status')}</th>
                    <th>
                      <span className="sr-only">{t('orders_page.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap font-semibold tabular">{order.order_number}</td>
                      <td className="min-w-48">{renderItemsSummary(order)}</td>
                      <td className="whitespace-nowrap">
                        <CustomerCell order={order} />
                      </td>
                      <td className="whitespace-nowrap font-medium tabular">{money(order.total_amount)}</td>
                      <td className="whitespace-nowrap text-muted" title={new Date(order.created_at).toLocaleString()}>
                        {relativeTime(order.created_at)}
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>{renderRowActions(order)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {visibleOrders.map((order) => (
              <li key={order.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold tabular">{order.order_number}</p>
                    <p className="mt-0.5 text-sm text-muted">{relativeTime(order.created_at)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-3 text-sm">{renderItemsSummary(order)}</div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                  <CustomerCell order={order} />
                  <span className="font-semibold tabular">{money(order.total_amount)}</span>
                </div>
                <div className="mt-2">{renderRowActions(order)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Order details */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} labelledBy="order-details-title" size="lg">
        {selectedOrder && (
          <div>
            <p className="eyebrow text-muted">{t('orders_page.order_details')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 pe-10">
              <h2 id="order-details-title" className="text-3xl tabular">
                {t('orders_page.order')} {selectedOrder.order_number}
              </h2>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-cream/70 p-4 text-sm">
              <div>
                <dt className="text-muted">{t('orders_page.date')}</dt>
                <dd className="mt-0.5 font-medium">
                  {new Date(selectedOrder.created_at).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'en-GB')}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t('orders_page.customer')}</dt>
                <dd className="mt-0.5 font-medium">
                  <CustomerCell order={selectedOrder} />
                </dd>
              </div>
              {selectedOrder.address && (
                <div className="col-span-2">
                  <dt className="text-muted">
                    {selectedOrder.is_external ? t('orders_page.customer_address') : t('orders_page.delivery_address')}
                  </dt>
                  <dd className="mt-0.5 font-medium">{selectedOrder.address}</dd>
                </div>
              )}
              {selectedOrder.phone_number && (
                <div className="col-span-2">
                  <dt className="text-muted">{t('orders_page.phone')}</dt>
                  <dd className="mt-0.5 font-medium tabular">
                    <a href={`tel:${selectedOrder.phone_number}`} dir="ltr" className="link-underline">
                      {selectedOrder.phone_number}
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            <h3 className="eyebrow mt-6 text-muted">{t('orders_page.items')}</h3>
            {selectedOrder.items.length > 0 ? (
              <ul className="mt-2 divide-y divide-line">
                {selectedOrder.items.map((item, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium">
                        <span className="tabular text-muted">{item.quantity}×</span> {item.name}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-sm text-muted">
                          {t('orders_page.note')}: {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="whitespace-nowrap font-medium tabular">{money(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">{t('orders_page.no_items')}</p>
            )}

            <div className="mt-2 flex items-baseline justify-between border-t border-ink pt-4">
              <span className="font-semibold">{t('orders_page.total')}</span>
              <span className="font-display text-3xl tabular">{money(selectedOrder.total_amount)}</span>
            </div>

            {selectedOrder.notes && (
              <div className="mt-6 rounded-2xl border border-line p-4 text-sm">
                <p className="font-semibold">{t('orders_page.order_notes')}</p>
                <p className="mt-1 whitespace-pre-wrap text-ink-soft">{selectedOrder.notes}</p>
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                className="btn btn-quiet btn-sm !text-danger hover:!bg-danger/10"
              >
                <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                {t('orders_page.delete_order')}
              </button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => handleDownloadReceipt(selectedOrder)} className="btn btn-ghost btn-sm">
                  <Printer size={16} strokeWidth={1.75} aria-hidden="true" />
                  {t('orders_page.print_receipt')}
                </button>
                {selectedOrder.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'cancelled')}
                    className="btn btn-ghost btn-sm"
                  >
                    <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    {t('orders_page.cancel')}
                  </button>
                )}
                {selectedOrder.status !== 'served' && selectedOrder.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'served')}
                    className="btn btn-primary btn-sm"
                  >
                    <Check size={16} strokeWidth={2} aria-hidden="true" />
                    {t('orders_page.mark_complete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
