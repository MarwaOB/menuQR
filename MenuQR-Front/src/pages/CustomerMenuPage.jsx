import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Loader2, SearchX, ShoppingBag, X } from 'lucide-react';
import { menuAPI, orderAPI } from '../utils/api';
import useCart from '../hooks/useCart';
import OrderHeader from '../components/order/OrderHeader';
import CategoryNav from '../components/order/CategoryNav';
import OrderDishCard from '../components/order/OrderDishCard';
import CartPanel from '../components/order/CartPanel';
import { EmptyMenuState, LoadErrorState, MenuSkeleton, NoMenuState } from '../components/order/OrderStates';
import { formatMenuDate, formatPrice } from '../lib/format';
import site from '../data/site';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-cream p-6 text-ink">
          <div className="max-w-md text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika-soft text-paprika">
              <AlertTriangle size={30} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h2 className="mt-6 font-display text-4xl font-light">Something went wrong</h2>
            <p className="mt-3 text-ink-soft">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button onClick={this.handleRetry} className="btn btn-primary mt-8">
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ORDER_TYPES = ['dine-in', 'delivery'];

const CustomerMenuPage = ({ id = 'current' }) => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noMenuAvailable, setNoMenuAvailable] = useState(false);
  const [menuData, setMenuData] = useState(null);

  const { cart, addToCart, updateQuantity, clearCart, total, count, quantities } = useCart();
  const [showCart, setShowCart] = useState(false);
  const [step, setStep] = useState('cart'); // 'cart' | 'details' | 'success'
  const [orderStatus, setOrderStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Client type and details (can be preset from the URL: ?type=delivery, ?table=12)
  const [clientType, setClientType] = useState(() => {
    const type = searchParams.get('type');
    if (ORDER_TYPES.includes(type)) return type;
    return searchParams.get('table') ? 'dine-in' : null;
  });
  const [tableNumber, setTableNumber] = useState(() => searchParams.get('table') || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Browsing
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [bump, setBump] = useState(0);
  const [offset, setOffset] = useState(0);
  const headerRef = useRef(null);
  const spyLocked = useRef(false);
  const deepLinked = useRef(false);

  useEffect(() => {
    document.title = `${t('order.title')} — ${site.name}`;
  }, [t]);

  // Load menu data
  const fetchMenuData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoMenuAvailable(false);

      const data = id === 'current' || !id ? await menuAPI.getCurrent() : await menuAPI.getFull(id);

      // No data returned — treat as empty menu, not an error
      if (!data) {
        setNoMenuAvailable(true);
        processMenuData({ sections: [] });
        return;
      }

      processMenuData(data);
    } catch (err) {
      console.error('Error loading menu:', err);

      const status = err?.response?.status;
      const message = err?.message || '';

      // 404 or "no menu" messages = empty state, not a crash
      if (status === 404 || message.toLowerCase().includes('no menu') || message.toLowerCase().includes('not found')) {
        setNoMenuAvailable(true);
        processMenuData({ sections: [] });
        return;
      }

      // Real network/server error
      setError({
        message: t('order.error_load'),
        retry: fetchMenuData,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const processMenuData = (data) => {
    setMenuData(data);
    const sectionsData = (data.sections || []).map((section) => ({
      ...section,
      dishes: (section.dishes || []).map((dish) => ({
        ...dish,
        section_id: section.id,
        section_name: section.name,
      })),
    }));
    setSections(sectionsData);
  };

  // Sections with dishes, narrowed by the search query.
  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections
      .map((section) => ({
        ...section,
        dishes: q
          ? section.dishes.filter(
              (d) => d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q) || section.name?.toLowerCase().includes(q)
            )
          : section.dishes,
      }))
      .filter((section) => section.dishes.length > 0);
  }, [sections, query]);

  const totalDishes = useMemo(() => sections.reduce((n, s) => n + s.dishes.length, 0), [sections]);

  // Sticky header height → scroll offsets for sections and the scroll-spy.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setOffset(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, error, noMenuAvailable]);

  // Scroll-spy: the section under the header is the active category.
  useEffect(() => {
    if (!visibleSections.length) return undefined;
    setActiveSection((current) => (visibleSections.some((s) => s.id === current) ? current : visibleSections[0].id));
    const io = new IntersectionObserver(
      (entries) => {
        if (spyLocked.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActiveSection(Number(visible[0].target.dataset.section));
      },
      { rootMargin: `-${offset + 8}px 0px -60% 0px` }
    );
    visibleSections.forEach((s) => {
      const el = document.getElementById(`section-${s.id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [visibleSections, offset]);

  const selectSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    spyLocked.current = true;
    const el = document.getElementById(`section-${sectionId}`);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => (spyLocked.current = false), 900);
  }, []);

  // Deep link from the home page: /menu/order?dish=ID scrolls to and highlights the dish.
  useEffect(() => {
    const dishId = searchParams.get('dish');
    if (!dishId || deepLinked.current || !sections.length) return undefined;
    deepLinked.current = true;
    const el = document.getElementById(`dish-${dishId}`);
    if (!el) return undefined;
    el.scrollIntoView({ block: 'center' });
    setHighlightId(Number(dishId));
    const timer = window.setTimeout(() => setHighlightId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [sections, searchParams]);

  // Cart actions
  const handleAdd = useCallback(
    (dish) => {
      addToCart(dish);
      setBump((b) => b + 1);
    },
    [addToCart]
  );

  const openCart = () => {
    if (step === 'success') setStep('cart');
    setFormError(null);
    setShowCart(true);
  };

  const closeCart = useCallback(() => {
    setShowCart(false);
    setStep((s) => (s === 'success' ? 'cart' : s));
  }, []);

  // Order placement
  const validateOrder = () => {
    if (cart.length === 0) {
      setFormError(t('order.cart_empty_err'));
      return false;
    }

    if (clientType === 'dine-in' && !String(tableNumber).trim()) {
      setFormError(t('order.table_required'));
      return false;
    }

    if (clientType === 'delivery' && !deliveryAddress.trim()) {
      setFormError(t('order.address_required'));
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateOrder()) return;

    try {
      setIsSubmitting(true);
      setOrderStatus('placing');
      setFormError(null);

      await placeOrder();

      setOrderStatus('success');
      clearOrderForm();
      setStep('success');
      setTimeout(() => setOrderStatus(null), 3000);
    } catch (error) {
      console.error('Error placing order:', error);
      setFormError(error.response?.data?.message || t('order.order_failed'));
      setOrderStatus('error');
      setTimeout(() => setOrderStatus(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const placeOrder = async () => {
    try {
      let clientResult;
      const menuId = id === 'current' || !id ? menuData?.id || 1 : id;

      if (clientType === 'dine-in') {
        clientResult = await orderAPI.createInternalClient(parseInt(tableNumber));
      } else if (clientType === 'delivery') {
        clientResult = await orderAPI.createExternalClient({
          address: deliveryAddress,
          phone_number: phoneNumber,
        });
      }

      if (!clientResult?.client_id) {
        throw new Error('Failed to create client');
      }

      const orderData = {
        menu_id: menuId,
        client_id: clientResult.client_id,
        client_type: clientType === 'dine-in' ? 'internal' : 'external',
        order_type: clientType,
        dishes: cart.map((item) => ({
          dish_id: item.id,
          quantity: item.quantity,
        })),
        ...(clientType === 'delivery' && { delivery_address: deliveryAddress }),
      };

      const response = await orderAPI.create(orderData);

      if (!response || !response.order_id) {
        throw new Error('Failed to create order');
      }

      return response;
    } catch (error) {
      console.error('Order placement error:', error);
      throw error;
    }
  };

  const clearOrderForm = () => {
    clearCart();
    setClientType(null);
    setTableNumber('');
    setDeliveryAddress('');
    setPhoneNumber('');
  };

  const menuDate = formatMenuDate(menuData?.date, i18n.language);
  const headerProps = { count, total, onOpenCart: openCart, bump, headerRef };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-svh bg-cream text-ink">
        <OrderHeader {...headerProps} showSearch={false} />
        <MenuSkeleton />
      </div>
    );
  }

  // ── Real error state (network/server failure) ──────────────────────────────
  if (error && !noMenuAvailable) {
    return (
      <div className="min-h-svh bg-cream text-ink">
        <OrderHeader {...headerProps} showSearch={false} />
        <LoadErrorState
          message={error.message}
          retrying={loading}
          onRetry={
            error.retry &&
            (() => {
              setError(null);
              error.retry();
            })
          }
        />
      </div>
    );
  }

  // ── No menu available state ────────────────────────────────────────────────
  if (noMenuAvailable) {
    return (
      <div className="min-h-svh bg-cream text-ink">
        <OrderHeader {...headerProps} showSearch={false} />
        <NoMenuState onRefresh={fetchMenuData} />
      </div>
    );
  }

  // ── Main menu view ─────────────────────────────────────────────────────────
  return (
    <ErrorBoundary onRetry={fetchMenuData}>
      <div className="min-h-svh bg-cream text-ink">
        <OrderHeader {...headerProps} query={query} onQuery={setQuery}>
          {!query && <CategoryNav sections={visibleSections} active={activeSection} onSelect={selectSection} />}
        </OrderHeader>

        <main className="mx-auto max-w-6xl px-4 pb-32 sm:px-6">
          {/* Title */}
          <div className="flex flex-col gap-2 pb-8 pt-10 sm:flex-row sm:items-end sm:justify-between sm:pt-14">
            <div>
              <p className="eyebrow mb-3 text-paprika">{menuData?.name || t('customer.restaurant_menu')}</p>
              <h1 className="font-display text-display-md font-light">{t('order.title')}</h1>
            </div>
            <p className="text-sm text-muted">
              {menuDate && <span className="capitalize">{menuDate}</span>}
              {menuDate && totalDishes > 0 && ' · '}
              {totalDishes > 0 && t('order.dishes', { n: totalDishes })}
            </p>
          </div>

          {/* Menu exists but has no dishes at all */}
          {totalDishes === 0 && <EmptyMenuState />}

          {/* Search with no results */}
          {totalDishes > 0 && visibleSections.length === 0 && (
            <div className="py-20 text-center" role="status">
              <SearchX size={36} strokeWidth={1.25} className="mx-auto text-muted" aria-hidden="true" />
              <h2 className="mt-5 font-display text-3xl font-light">{t('order.no_results', { query })}</h2>
              <p className="mt-2 text-ink-soft">{t('order.no_results_hint')}</p>
              <button type="button" onClick={() => setQuery('')} className="btn btn-ghost mt-6">
                {t('order.clear_search')}
              </button>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-14">
            {visibleSections.map((section) => (
              <section
                key={section.id}
                id={`section-${section.id}`}
                data-section={section.id}
                aria-labelledby={`section-title-${section.id}`}
                style={{ scrollMarginTop: offset + 12 }}
              >
                <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-3">
                  <h2 id={`section-title-${section.id}`} className="font-display text-3xl" dir="auto">
                    {section.name}
                  </h2>
                  <span className="text-sm text-muted tabular-nums">{t('order.dishes', { n: section.dishes.length })}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                  {section.dishes.map((dish) => (
                    <OrderDishCard
                      key={dish.id}
                      dish={dish}
                      quantity={quantities[dish.id] || 0}
                      onAdd={handleAdd}
                      onQuantity={updateQuantity}
                      highlighted={highlightId === dish.id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>

        {/* Mobile / tablet: floating order bar */}
        <div
          className={`fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-all duration-500 ease-[var(--ease-out-expo)] lg:hidden ${
            count > 0 && !showCart ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={openCart}
            tabIndex={count > 0 && !showCart ? 0 : -1}
            className="flex h-14 w-full items-center justify-between rounded-full bg-ink ps-2 pe-6 text-paper shadow-[0_20px_40px_-18px_rgb(27_22_17/0.7)]"
          >
            <span className="flex items-center gap-3">
              <span key={bump} className="flex h-10 w-10 items-center justify-center rounded-full bg-paprika text-sm font-semibold motion-safe:animate-[fadeIn_0.4s_var(--ease-out-expo)]">
                {count}
              </span>
              <span className="font-semibold">{t('order.view_order')}</span>
            </span>
            <span className="font-semibold tabular-nums">
              {formatPrice(total, i18n.language)} {t('currency')}
            </span>
          </button>
        </div>

        <CartPanel
          open={showCart}
          onClose={closeCart}
          step={step}
          setStep={(s) => {
            setFormError(null);
            setStep(s);
          }}
          cart={cart}
          count={count}
          total={total}
          onQuantity={updateQuantity}
          clientType={clientType}
          setClientType={(type) => {
            setFormError(null);
            setClientType(type);
          }}
          tableNumber={tableNumber}
          setTableNumber={setTableNumber}
          deliveryAddress={deliveryAddress}
          setDeliveryAddress={setDeliveryAddress}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          onPlaceOrder={handlePlaceOrder}
          isSubmitting={isSubmitting}
          formError={formError}
        />

        {/* Order Status Messages */}
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4" role="status" aria-live="polite">
          {orderStatus && (
            <div
              className={`flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-medium shadow-xl motion-safe:animate-[fadeIn_0.4s_var(--ease-out-expo)] ${
                orderStatus === 'success' ? 'bg-olive text-paper' : orderStatus === 'error' ? 'bg-paprika text-paper' : 'bg-ink text-paper'
              }`}
            >
              {orderStatus === 'success' && <Check size={16} aria-hidden="true" />}
              {orderStatus === 'error' && <X size={16} aria-hidden="true" />}
              {orderStatus === 'placing' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              <span>
                {orderStatus === 'success' && t('customer.order_placed_success')}
                {orderStatus === 'error' && t('customer.order_error')}
                {orderStatus === 'placing' && t('order.placing')}
              </span>
            </div>
          )}
        </div>

        {/* Desktop: quick access to the order when the cart has items */}
        {count > 0 && !showCart && (
          <button
            type="button"
            onClick={openCart}
            className="fixed bottom-8 z-30 hidden h-14 items-center gap-3 rounded-full bg-ink ps-3 pe-6 text-paper shadow-[0_20px_40px_-18px_rgb(27_22_17/0.7)] transition-colors hover:bg-paprika lg:flex ltr:right-8 rtl:left-8"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper/15">
              <ShoppingBag size={17} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="font-semibold">{t('order.view_order')}</span>
            <span className="tabular-nums text-paper/70">
              {formatPrice(total, i18n.language)} {t('currency')}
            </span>
          </button>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default CustomerMenuPage;
