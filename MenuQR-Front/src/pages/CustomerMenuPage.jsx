import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaShoppingCart, FaWifi, FaCheck, FaTimes, FaUtensils, FaTruck, FaServer, FaGlobe } from 'react-icons/fa';
import { menuAPI } from '../utils/api';
import DishCard from '../components/UI/DishCard';
import config from '../config';
import CategoryFilterBar from '../components/UI/CategoryFilterBar';
import MyButton from '../components/UI/Button';

const CustomerMenuPage = ({ id = 'current' }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Server detection - only two states: local (no internet) or online (with internet)
  const [isLocalServer, setIsLocalServer] = useState(false);
  const [serverType, setServerType] = useState('detecting'); // 'detecting', 'local', 'online'

  const [sections, setSections] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('customerCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [showCart, setShowCart] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null);
  
  // Client type and details
  const [clientType, setClientType] = useState(null);
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [menuData, setMenuData] = useState(null);

  const categories = ['All', ...sections.map(section => section.name)];

  // Detect server type on component mount
  useEffect(() => {
    const detectServerType = () => {
      const hostname = window.location.hostname;
      const isLocal = (
        hostname === '192.168.1.100' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.0.') ||
        hostname === 'localhost'
      );
      
      setIsLocalServer(isLocal);
      setServerType(isLocal ? 'local' : 'online');
    };

    detectServerType();
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('customerCart', JSON.stringify(cart));
  }, [cart]);

  // Load menu data based on server type
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        let data;

        if (isLocalServer) {
          // LOCAL SERVER (no internet): Use local APIs or cached data
          try {
            data = await fetchFromLocalAPI();
          } catch (localError) {
            console.log('Local API failed, using cache:', localError);
            data = await loadFromCache();
          }
        } else {
          // ONLINE SERVER (with internet): Use online APIs
          try {
            data = await fetchFromOnlineAPI();
            // Cache successful data for potential offline use later
            if (data) {
              localStorage.setItem('cachedMenuData', JSON.stringify(data));
            }
          } catch (onlineError) {
            console.log('Online API failed, using cache:', onlineError);
            data = await loadFromCache();
          }
        }

        if (data) {
          processMenuData(data);
        }
      } catch (err) {
        console.error('Error loading menu:', err);
        // Final fallback to cache
        try {
          const data = await loadFromCache();
          if (data) {
            processMenuData(data);
          }
        } catch (cacheError) {
          console.error('No data available:', cacheError);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch when we know the server type
    if (serverType !== 'detecting') {
      fetchMenuData();
    }
  }, [id, serverType, isLocalServer]);

  // Helper functions for data fetching
  const fetchFromLocalAPI = async () => {
    // Local server API call (no internet required)
    const response = await fetch(config.getApiUrl(`/menu/${id === 'current' ? 'current' : id}`));
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Local API request failed:', errorText);
      throw new Error('Local API request failed');
    }
    return await response.json();
  };

  const fetchFromOnlineAPI = async () => {
    // Online server API call (internet required)
    if (id === 'current' || !id) {
      return await menuAPI.getCurrent();
    } else {
      return await menuAPI.getFull(id);
    }
  };

  const loadFromCache = async () => {
    const cachedData = localStorage.getItem('cachedMenuData');
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    throw new Error('No cached data available');
  };

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

  // Order placement based on server type
  const handlePlaceOrder = async () => {
    // Validation
    if (clientType === 'dine-in' && !tableNumber.trim()) {
      alert('Please enter your table number');
      return;
    }
    
    if (clientType === 'delivery' && !deliveryAddress.trim()) {
      alert('Please enter your delivery address');
      return;
    }

    // Local server only allows dine-in (no internet = no delivery)
    if (isLocalServer && clientType !== 'dine-in') {
      alert('Only dine-in orders are available on the local network');
      return;
    }

    if (cart.length === 0) return;

    try {
      setOrderStatus('placing');
      
      if (isLocalServer) {
        // Local server (no internet) - store order locally
        await placeOrderLocal();
      } else {
        // Online server (with internet) - use online API
        await placeOrderOnline();
      }
      
    } catch (error) {
      console.error('Error placing order:', error);
      setOrderStatus('error');
      setTimeout(() => setOrderStatus(null), 3000);
    }
  };

  const getBaseUrl = () => {
    // Get the base URL and ensure it doesn't end with a slash
    let baseUrl = config.API_BASE_URL || '';
    
    // Remove trailing slash if it exists
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Remove '/api' suffix if it exists
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4);
    }
    
    console.log('Base URL:', baseUrl);
    return baseUrl;
  };

  const placeOrderLocal = async () => {
    try {
      // Step 1: Create internal client first
      const baseUrl = getBaseUrl();
      const clientEndpoint = `${baseUrl}/api/order/clients/internal/add`;
      console.log('Making request to:', clientEndpoint);
      
      // Create client request body
      const clientRequestBody = {
        table_number: parseInt(tableNumber)
      };
      
      console.log('Creating client with data:', clientRequestBody);
      
      // Create client
      const clientResponse = await fetch(clientEndpoint, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(clientRequestBody)
      });
      
      console.log('Client creation response status:', clientResponse.status);
      
      if (!clientResponse.ok) {
        const errorText = await clientResponse.text();
        console.error('Failed to create client:', errorText);
        throw new Error(`Failed to create client: ${clientResponse.status} ${clientResponse.statusText}`);
      }
      
      const clientData = await clientResponse.json();
      console.log('Client created successfully:', clientData);

      // Step 2: Create order with the client_id
      const orderData = {
        menu_id: menuData?.id || 1,
        client_id: clientData.client_id,
        client_type: 'internal',
        dishes: cart.map(item => ({
          dish_id: item.id,
          quantity: item.quantity
        }))
      };

      console.log('Creating order with data:', orderData);
      
      const orderResponse = await fetch(`${getBaseUrl()}/api/order/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      console.log('Order creation response status:', orderResponse.status);
      
      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('Failed to create order:', errorText);
        throw new Error(`Failed to create order: ${orderResponse.status} ${orderResponse.statusText}`);
      }

      const orderResult = await orderResponse.json();
      console.log('Order created successfully:', orderResult);
      
      setOrderStatus('success');
      return orderResult;
      
    } catch (apiError) {
      console.error('Error in placeOrderLocal:', apiError);
      
      // Fallback: Store locally for manual processing
      console.log('Local API failed, storing for manual processing');
      
      const offlineOrder = {
        id: Date.now(),
        clientType: 'dine-in',
        tableNumber,
        cart,
        timestamp: new Date().toISOString(),
        status: 'pending',
        error: apiError.message
      };
      
      try {
        const localOrders = JSON.parse(localStorage.getItem('localOrders') || '[]');
        localOrders.push(offlineOrder);
        localStorage.setItem('localOrders', JSON.stringify(localOrders));
        console.log('Order stored locally');
        setOrderStatus('stored_locally');
      } catch (storageError) {
        console.error('Failed to store order locally:', storageError);
        setOrderStatus('error');
        throw new Error('Failed to process order and could not save locally');
      }
      
      throw apiError; // Re-throw to be handled by the caller if needed
    }

    clearOrderForm();
    setTimeout(() => setOrderStatus(null), 3000);
  };

  const placeOrderOnline = async () => {
    // Online server - use direct fetch calls
    let clientResult;
    const menuId = id === 'current' || !id ? (menuData?.id || 1) : id;
    
    if (clientType === 'dine-in') {
      // Direct fetch for internal client
      const baseUrl = getBaseUrl();
      console.log('Making request to:', `${baseUrl}/order/clients/internal/add`);
      const response = await fetch(`${baseUrl}/order/clients/internal/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: parseInt(tableNumber) })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create client');
      }
      
      clientResult = await response.json();
    } else if (clientType === 'delivery') {
      // Direct fetch for external client
      const baseUrl = getBaseUrl();
      console.log('Making request to:', `${baseUrl}/order/clients/external/add`);
      const response = await fetch(`${baseUrl}/order/clients/external/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: deliveryAddress,
          phone_number: phoneNumber
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create client');
      }
      
      clientResult = await response.json();
    }
    
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

    await orderAPI.create(orderData);
    setOrderStatus('success');
    clearOrderForm();
    setTimeout(() => setOrderStatus(null), 3000);
  };

  const clearOrderForm = () => {
    setCart([]);
    setClientType(null);
    setTableNumber('');
    setDeliveryAddress('');
    setPhoneNumber('');
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Server Type Indicator */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isLocalServer 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {isLocalServer ? <FaServer /> : <FaGlobe />}
                <span className="font-medium">
                  {isLocalServer ? 'Local Server' : 'Online Server'}
                </span>
              </div>

              {/* Connection Status */}
              <div className={`flex items-center gap-2 ${
                isLocalServer ? 'text-orange-600' : 'text-green-600'
              }`}>
                <FaWifi />
                <span className="text-sm font-medium">
                  {isLocalServer ? 'LAN Only' : 'Internet'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
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
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Menu Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-500 mb-2">
            {t('customer.restaurant_menu')}
          </h1>
          <p className="text-gray-600">
            {isLocalServer 
              ? 'Served from local restaurant server • No internet required'
              : 'Live menu from online server'
            }
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
                      
                      {/* Only show delivery on online server */}
                      {!isLocalServer && (
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
                      )}
                    </div>

                    {/* Local server notice */}
                    {isLocalServer && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <FaServer className="inline mr-1" />
                          Restaurant network: Dine-in orders only
                        </p>
                      </div>
                    )}
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
                
                {/* Delivery Form - Only on online server */}
                {clientType === 'delivery' && !isLocalServer && (
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
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('customer.place_order')}
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
              <span>
                {orderStatus === 'success' && t('customer.order_placed_success')}
                {orderStatus === 'error' && t('customer.order_error')}
                {orderStatus === 'stored_locally' && 'Order stored locally - staff will be notified'}
                {orderStatus === 'placing' && t('customer.placing_order')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenuPage;