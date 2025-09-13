import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FaShoppingCart, 
  FaCheck, 
  FaTimes, 
  FaUtensils, 
  FaSync, 
  FaSpinner 
} from 'react-icons/fa';
import { menuAPI } from '../utils/api';
import DishCard from '../components/UI/DishCard';
import config from '../config';
import CategoryFilterBar from '../components/UI/CategoryFilterBar';
import MyButton from '../components/UI/Button';
import { syncService } from '../services/syncService';

const CustomerMenuPage = ({ id = 'current' }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Menu state
  const [sections, setSections] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  
  // Cart state
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('customerCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  // UI state
  const [showCart, setShowCart] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null);
  const [tableNumber, setTableNumber] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSync: null,
    pendingCount: 0,
    error: null
  });

  const [menuData, setMenuData] = useState(null);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Set up sync status listener
  useEffect(() => {
    const updateSyncStatus = () => {
      const status = syncService.getSyncStatus();
      setSyncStatus({
        isSyncing: status.isSyncing,
        lastSync: status.lastSync,
        pendingCount: status.pendingCount,
        error: null
      });
    };
    
    // Initial status
    updateSyncStatus();
    
    // Subscribe to sync status changes
    const unsubscribe = syncService.addSyncListener(({ status, ...data }) => {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: status === 'syncing',
        error: status === 'error' ? data.error || 'Sync failed' : null,
        lastSync: status === 'success' ? new Date() : prev.lastSync,
        pendingCount: status === 'success' || status === 'error' 
          ? syncService.getPendingOrders().length 
          : prev.pendingCount
      }));
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const categories = ['All', ...sections.map(section => section.name)];

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('customerCart', JSON.stringify(cart));
  }, [cart]);
  
  // Format price with 2 decimal places
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  // Get total items in cart
  const getCartItemCount = useCallback(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  // Get cart total price
  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  // Load menu data
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        let data;

        try {
          let menuId = id;
          
          // If 'current' is requested, first get the current menu ID
          if (id === 'current') {
            const currentMenuResponse = await fetch(config.getApiUrl('/menu/current'));
            if (!currentMenuResponse.ok) {
              throw new Error('Failed to fetch current menu ID');
            }
            const currentMenuData = await currentMenuResponse.json();
            menuId = currentMenuData.id;
          }
          
          // Now fetch the full menu with the resolved ID
          const response = await fetch(config.getApiUrl(`/menu/${menuId}/full`));
          if (!response.ok) {
            throw new Error('Failed to fetch menu details');
          }
          data = await response.json();
          // Cache the successful response
          localStorage.setItem('cachedMenuData', JSON.stringify(data));
        } catch (error) {
          console.log('API request failed, trying cache...', error);
          // Fallback to cache if API fails
          const cachedData = localStorage.getItem('cachedMenuData');
          if (cachedData) {
            data = JSON.parse(cachedData);
          } else {
            throw new Error('No cached data available');
          }
        }

        if (data) {
          processMenuData(data);
        }
      } catch (err) {
        console.error('Error loading menu:', err);
        setOrderStatus('error');
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
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

  const addToCart = (dish) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === dish.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === dish.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...dish, quantity: 1 }];
    });
  };

  const removeFromCart = (dishId) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === dishId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item =>
          item.id === dishId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prevCart.filter(item => item.id !== dishId);
    });
  };

  const placeOrder = async () => {
    if (!tableNumber) {
      setOrderStatus('error');
      return;
    }

    try {
      setOrderStatus('loading');
      
      // First, get or create a client for this table
      console.log('Creating client for table:', tableNumber);
      const clientResponse = await fetch(`${config.API_BASE_URL}/order/clients/internal/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_number: parseInt(tableNumber)
        })
      });

      if (!clientResponse.ok) {
        const error = await clientResponse.json().catch(() => ({}));
        console.error('Client creation failed:', error);
        throw new Error(error.error || 'Failed to create table client');
      }

      const clientData = await clientResponse.json();
      console.log('Client created:', clientData);
      
      if (!clientData.client_id) {
        throw new Error('Invalid client data received from server');
      }
      
      // Prepare order data according to backend expectations
      const orderData = {
        menu_id: menuData?.id || 1,
        client_id: clientData.client_id,
        client_type: 'internal',
        table_number: parseInt(tableNumber), // Add table_number to the order data
        dishes: cart.map(item => ({
          dish_id: item.id,
          quantity: item.quantity
        }))
      };

      console.log('Saving order to local database:', orderData);
      
      // Save to local database
      const response = await fetch(`${config.API_BASE_URL}/order/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Order creation failed:', error);
        throw new Error(error.error || 'Failed to save order to local database');
      }

      const savedOrder = await response.json();
      console.log('Order saved locally:', savedOrder);
      
      // Create a new order object with all required fields for syncing
      const syncOrder = {
        ...orderData,  // This contains menu_id, client_id, client_type, table_number, dishes
        order_id: savedOrder.order_id  // Include the server-generated order ID
      };
      
      // Add to sync service for potential future syncs
      const localOrderId = syncService.addPendingOrder(syncOrder);
      console.log('Added to sync service with ID:', localOrderId);
      
      // Clear cart and reset form
      setCart([]);
      setTableNumber('');
      setOrderStatus('success');
      setShowCart(false);
      
      // Show success message
      setTimeout(() => setOrderStatus(null), 3000);
      
      // Try to sync with deployed backend if online
      if (navigator.onLine) {
        console.log('Online - attempting to sync pending orders...');
        syncService.syncPendingOrders().catch(error => {
          console.error('Error syncing orders:', error);
        });
      }
      
    } catch (error) {
      console.error('Error placing order:', error);
      setOrderStatus('error');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {menuData?.name || t('menu.title')}
            </h1>
            <div className="flex items-center space-x-4">
              {/* Sync status indicator */}
              <div className="hidden sm:flex items-center text-sm text-gray-600">
                <span className="mr-2">
                  <span className={isOnline ? 'text-emerald-500' : 'text-rose-500'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  {syncStatus.pendingCount > 0 && ` • ${syncStatus.pendingCount} pending`}
                </span>
                {syncStatus.isSyncing && (
                  <FaSync className="ml-2 h-3 w-3 text-blue-500 animate-spin" />
                )}
              </div>
              
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
              >
                <FaShoppingCart className="h-6 w-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {getCartItemCount()}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile sync status */}
          <div className="mt-2 sm:hidden text-xs text-gray-500 flex items-center">
            <span className={isOnline ? 'text-emerald-500' : 'text-rose-500'}>
              {isOnline ? 'Online' : 'Offline'}
              {syncStatus.pendingCount > 0 && ` • ${syncStatus.pendingCount} pending`}
            </span>
            {syncStatus.isSyncing && (
              <FaSync className="ml-1 h-3 w-3 text-blue-500 animate-spin" />
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-500 mb-2">
            {t('customer.restaurant_menu')}
          </h1>
          <p className="text-gray-600">
            Served from local restaurant server • No internet required
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
              <div className="p-4">
                <button
                  onClick={() => addToCart(dish)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowCart(false)}
          ></div>
          
          {/* Cart Container */}
          <div className="relative w-full max-w-md max-h-[90vh] bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20 transform transition-all">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-yellow-400 to-red-500 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Order</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
              {cart.length > 0 && (
                <p className="mt-1 text-sm text-white/90">
                  {cart.reduce((total, item) => total + item.quantity, 0)} items in cart
                </p>
              )}
            </div>
            
            {/* Cart Content */}
            <div className="flex flex-col h-full">
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {cart.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="bg-white/80 p-6 rounded-2xl shadow-inner">
                      <FaShoppingCart className="mx-auto h-16 w-16 text-yellow-400/70 mb-4" />
                      <h3 className="text-lg font-medium text-gray-800">Your cart is empty</h3>
                      <p className="mt-2 text-gray-500">Start adding some delicious items to your order</p>
                      <button
                        onClick={() => setShowCart(false)}
                        className="mt-6 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        Browse Menu
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ul className="space-y-4">
                      {cart.map((item) => (
                        <li key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{item.name}</h3>
                              <p className="text-sm text-gray-500">{item.description}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateQuantity(item.id, item.quantity - 1);
                                    }}
                                    className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                                  >
                                    -
                                  </button>
                                  <span className="px-3 w-8 text-center font-medium">{item.quantity}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateQuantity(item.id, item.quantity + 1);
                                    }}
                                    className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900 mr-3">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFromCart(item.id);
                                    }}
                                    className="text-red-400 hover:text-red-500 p-1 transition-colors"
                                  >
                                    <FaTimes className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Checkout Section */}
              <div className="bg-white p-6 border-t border-gray-100">
                <div className="flex justify-between text-lg font-semibold text-gray-900 mb-6">
                  <span>Total</span>
                  <span className="text-yellow-600">${formatPrice(getCartTotal())}</span>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="number"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Enter table number"
                      className="w-full p-3 pl-4 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                      min="1"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <FaUtensils className="h-5 w-5" />
                    </span>
                  </div>
                  <button
                    onClick={placeOrder}
                    disabled={!tableNumber || cart.length === 0 || orderStatus === 'loading'}
                    className={`w-full flex justify-center items-center px-6 py-4 rounded-xl text-lg font-semibold text-white shadow-lg transition-all transform hover:scale-[1.02] ${
                      !tableNumber || cart.length === 0 || orderStatus === 'loading'
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    }`}
                  >
                    {orderStatus === 'loading' ? (
                      <>
                        <FaSpinner className="animate-spin mr-3" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <FaCheck className="mr-2" />
                        Place Order • ${formatPrice(getCartTotal())}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
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
              {(orderStatus === 'placing' || orderStatus === 'loading') && (
                <FaSpinner className="animate-spin" />
              )}
              <span>
                {orderStatus === 'success' && 'Order placed successfully!'}
                {orderStatus === 'error' && 'Failed to place order. Please try again.'}
                {orderStatus === 'stored_locally' && 'Order stored locally - staff will be notified'}
                {orderStatus === 'placing' && 'Placing your order...'}
                {orderStatus === 'loading' && 'Processing...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenuPage;
