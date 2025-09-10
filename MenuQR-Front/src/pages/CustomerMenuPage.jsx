import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaShoppingCart, FaCheck, FaTimes, FaUtensils, FaTruck, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { menuAPI, orderAPI } from '../utils/api';
import DishCard from '../components/UI/DishCard';
import CategoryFilterBar from '../components/UI/CategoryFilterBar';
import MyButton from '../components/UI/Button';

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
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
            <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h2>
            <p className="text-red-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const CustomerMenuPage = ({ id = 'current' }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [sections, setSections] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('customerCart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error('Error parsing cart from localStorage:', e);
      return [];
    }
  });
  const [showCart, setShowCart] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client type and details
  const [clientType, setClientType] = useState(null);
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [menuData, setMenuData] = useState(null);

  const categories = ['All', ...sections.map(section => section.name)];

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('customerCart', JSON.stringify(cart));
  }, [cart]);

  // Load menu data
  const fetchMenuData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = id === 'current' || !id 
        ? await menuAPI.getCurrent()
        : await menuAPI.getFull(id);

      if (!data) {
        throw new Error('No data received from server');
      }

      processMenuData(data);
    } catch (err) {
      console.error('Error loading menu:', err);
      setError({
        message: 'Failed to load menu. Please check your connection and try again.',
        retry: fetchMenuData
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
    const sectionsData = data.sections || [];
    setSections(sectionsData);

    const allDishes = sectionsData.reduce((acc, section) => {
      if (section.dishes && section.dishes.length > 0) {
        const dishesWithSectionId = section.dishes.map(dish => ({
          ...dish,
          section_id: section.id
        }));
        return [...acc, ...dishesWithSectionId];
      }
      return acc;
    }, []);
    setDishes(allDishes);
  };

  // Filter dishes by selected section
  const filteredDishes = selectedCategory === 'All' 
    ? dishes 
    : dishes.filter(dish => 
        sections.find(section => section.id === dish.section_id)?.name === selectedCategory
      );

  // Cart functions
  const addToCart = (dish) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === dish.id);
      if (existingItem) {
        const currentQuantity = parseInt(existingItem.quantity) || 0;
        return prev.map(item =>
          item.id === dish.id
            ? { ...item, quantity: currentQuantity + 1 }
            : item
        );
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
  };

  const removeFromCart = (dishId) => {
    setCart(prev => prev.filter(item => item.id !== dishId));
  };

  const updateQuantity = (dishId, newQuantity) => {
    const quantity = parseInt(newQuantity);

    if (isNaN(quantity) || quantity <= 0) {
      removeFromCart(dishId);
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === dishId ? { ...item, quantity } : item
        )
      );
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('customerCart');
  };

  // Order placement
  const validateOrder = () => {
    if (cart.length === 0) {
      setError({ message: 'Your cart is empty' });
      return false;
    }

    if (clientType === 'dine-in' && !tableNumber.trim()) {
      setError({ message: 'Please enter your table number' });
      return false;
    }

    if (clientType === 'delivery' && !deliveryAddress.trim()) {
      setError({ message: 'Please enter your delivery address' });
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateOrder()) return;

    try {
      setIsSubmitting(true);
      setOrderStatus('placing');
      setError(null);

      await placeOrder();

      setOrderStatus('success');
      clearOrderForm();
      setTimeout(() => setOrderStatus(null), 3000);
    } catch (error) {
      console.error('Error placing order:', error);
      setError({
        message: error.response?.data?.message || 'Failed to place order. Please try again.',
        retry: handlePlaceOrder
      });
      setOrderStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const placeOrder = async () => {
    try {
      let clientResult;
      const menuId = id === 'current' || !id ? (menuData?.id || 1) : id;

      // Create client
      if (clientType === 'dine-in') {
        clientResult = await orderAPI.createInternalClient({ 
          table_number: parseInt(tableNumber) 
        });
      } else if (clientType === 'delivery') {
        clientResult = await orderAPI.createExternalClient({
          address: deliveryAddress,
          phone_number: phoneNumber
        });
      }

      if (!clientResult?.client_id) {
        throw new Error('Failed to create client');
      }

      // Prepare order data
      const orderData = {
        menu_id: menuId,
        client_id: clientResult.client_id,
        client_type: clientType === 'dine-in' ? 'internal' : 'external',
        order_type: clientType,
        dishes: cart.map(item => ({
          dish_id: item.id,
          quantity: item.quantity
        })),
        ...(clientType === 'delivery' && { delivery_address: deliveryAddress })
      };

      // Submit order
      const response = await orderAPI.create(orderData);

      if (!response || !response.order_id) {
        throw new Error('Failed to create order');
      }

      return response;
    } catch (error) {
      console.error('Order placement error:', error);
      throw error; // Re-throw to be handled by the caller
    }
  };

  const clearOrderForm = () => {
    setCart([]);
    setClientType(null);
    setTableNumber('');
    setDeliveryAddress('');
    setPhoneNumber('');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">{error.message}</p>
          {error.retry && (
            <button
              onClick={() => {
                setError(null);
                error.retry();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin inline-block mr-2" />
                  Loading...
                </>
              ) : (
                'Try Again'
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onRetry={fetchMenuData}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowCart(true)}
                className="relative bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaShoppingCart />
                <span>{t('customer.cart')}</span>
                {getCartItemCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getCartItemCount()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Menu Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-red-500 mb-2">
              {t('customer.restaurant_menu')}
            </h1>
            <p className="text-gray-600">
              {t('customer.fresh_menu')}
            </p>
          </div>

          {/* Category Filters */}
          <CategoryFilterBar
            categories={categories}
            selectedCategory={selectedCategory}
            onChange={setSelectedCategory}
          />

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filteredDishes.map((dish) => (
              <div key={dish.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <DishCard
                  image={dish.images && dish.images.length > 0 ? dish.images[0] : null}
                  name={dish.name}
                  description={dish.description}
                  price={dish.price}
                  showActions={false}
                />
                <div className="p-4 pt-0">
                  <MyButton
                    onClick={() => addToCart(dish)}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-2 rounded-lg transition-colors"
                  >
                    {t('customer.add_to_cart')}
                  </MyButton>
                </div>
              </div>
            ))}
          </div>

          {filteredDishes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('no_dishes_found') || 'No dishes found in this category.'}</p>
            </div>
          )}
        </div>

        {/* Cart Modal */}
        {showCart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{t('customer.your_cart')}</h3>
                  <button
                    onClick={() => setShowCart(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">{t('customer.cart_empty')}</p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.price} {t('currency')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, (parseInt(item.quantity) || 0) - 1)}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity || 0}</span>
                          <button
                            onClick={() => updateQuantity(item.id, (parseInt(item.quantity) || 0) + 1)}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">{t('customer.total')}:</span>
                    <span className="font-bold text-xl">{getCartTotal()} {t('currency')}</span>
                  </div>

                  {/* Client Type Selection */}
                  {!clientType && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3 text-gray-800">{t('customer.how_to_order')}</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          onClick={() => setClientType('dine-in')}
                          className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <FaUtensils className="text-blue-500" />
                          <div className="text-left">
                            <div className="font-medium">{t('customer.dine_in')}</div>
                            <div className="text-sm text-gray-600">{t('customer.dine_in_desc')}</div>
                          </div>
                        </button>

                        <button
                          onClick={() => setClientType('delivery')}
                          className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <FaTruck className="text-green-500" />
                          <div className="text-left">
                            <div className="font-medium">{t('customer.delivery')}</div>
                            <div className="text-sm text-gray-600">{t('customer.delivery_desc')}</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dine In Form */}
                  {clientType === 'dine-in' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('customer.table_number')}</label>
                      <input
                        type="number"
                        placeholder={t('customer.enter_table_number')}
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Delivery Form */}
                  {clientType === 'delivery' && (
                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('customer.delivery_address')} *</label>
                        <textarea
                          placeholder={t('customer.delivery_address_placeholder')}
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('customer.phone_number')}</label>
                        <input
                          type="tel"
                          placeholder={t('customer.phone_number_placeholder')}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {clientType && (
                      <button
                        onClick={() => setClientType(null)}
                        className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        {t('customer.change_order_type')}
                      </button>
                    )}

                    <MyButton
                      onClick={handlePlaceOrder}
                      disabled={
                        (clientType === 'dine-in' && !tableNumber.trim()) ||
                        (clientType === 'delivery' && !deliveryAddress.trim()) ||
                        !clientType
                      }
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          {t('customer.placing_order') || 'Placing Order...'}
                        </>
                      ) : (
                        t('customer.place_order')
                      )}
                    </MyButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Status Messages */}
        {orderStatus && (
          <div className="fixed top-4 right-4 z-50">
            <div className={`p-4 rounded-lg shadow-lg ${
              orderStatus === 'success' ? 'bg-green-500 text-white' :
              orderStatus === 'error' ? 'bg-red-500 text-white' :
              orderStatus === 'stored_locally' ? 'bg-yellow-500 text-black' :
              'bg-blue-500 text-white'
            }`}>
              <div className="flex items-center gap-2">
                {orderStatus === 'success' && <FaCheck />}
                {orderStatus === 'error' && <FaTimes />}
                {orderStatus === 'placing' && <FaSpinner className="animate-spin" />}
                <span>
                  {orderStatus === 'success' && t('customer.order_placed_success')}
                  {orderStatus === 'error' && t('customer.order_error')}
                  {orderStatus === 'stored_locally' && 'Order stored locally - staff will be notified'}
                  {orderStatus === 'placing' && (t('customer.placing_order') || 'Placing your order...')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default CustomerMenuPage;