import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { orderAPI } from '../../utils/api';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { FaSearch, FaFilter, FaSort, FaCheck, FaTimes, FaSpinner, FaPrint, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  served: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  // Map old statuses to new ones for backward compatibility
  ready: 'bg-green-100 text-green-800',       // Map to served
  completed: 'bg-green-100 text-green-800',   // Map to served
};

export default function OrdersTab() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to normalize order data
  const getStatusBadge = (status) => {
    const statusText = status === 'pending' ? t('orders_page.status_pending') :
                     status === 'served' ? t('orders_page.status_served') :
                     status === 'cancelled' ? t('orders_page.status_cancelled') : status;
    
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      served: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status === 'pending' && '⏳'}
        {status === 'served' && '✅'}
        {status === 'cancelled' && '❌'}
        <span className={isRTL ? 'mr-1' : 'ml-1'}>{statusText}</span>
      </span>
    );
  };

  const renderTableHeaders = () => {
    const headers = [
      {
        key: 'order_number',
        content: (
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            {t('orders_page.order_number')}
            <FaSort className={isRTL ? 'mr-1' : 'ml-1'} />
          </div>
        ),
        className: `px-6 py-3 text-${isRTL ? 'right' : 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer`,
        onClick: () => requestSort('order_number')
      },
      {
        key: 'items',
        content: t('orders_page.items'),
        className: `px-6 py-3 text-${isRTL ? 'right' : 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider`
      },
      {
        key: 'customer',
        content: t('orders_page.customer'),
        className: `px-6 py-3 text-${isRTL ? 'right' : 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider`
      },
      {
        key: 'total',
        content: (
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            {t('orders_page.total')}
            <FaSort className={isRTL ? 'mr-1' : 'ml-1'} />
          </div>
        ),
        className: `px-6 py-3 text-${isRTL ? 'right' : 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer`,
        onClick: () => requestSort('total_amount')
      },
      {
        key: 'time',
        content: (
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            {t('orders_page.time')}
            <FaSort className={isRTL ? 'mr-1' : 'ml-1'} />
          </div>
        ),
        className: `px-6 py-3 text-${isRTL ? 'right' : 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer`,
        onClick: () => requestSort('createdAt')
      },
      {
        key: 'status',
        content: t('orders_page.status'),
        className: `px-6 py-3 text-${isRTL ? 'right' : 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider`
      },
      {
        key: 'actions',
        content: t('orders_page.actions'),
        className: `px-6 py-3 text-${isRTL ? 'left' : 'right'} text-xs font-medium text-gray-500 uppercase tracking-wider`
      }
    ];

    // Reverse the order for RTL
    return isRTL ? [...headers].reverse() : headers;
  };

  const normalizeOrder = (order) => {
    if (!order) return null;
    
    // Ensure we have a valid ID
    const orderId = order.id || order._id || `order-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get items, handling both items and order_items formats
    let orderItems = [];
    if (Array.isArray(order.items)) {
      orderItems = order.items.map(item => ({
        ...item,
        name: item.name || item.dish_name || t('orders_page.unnamed_item'),
        price: Number(item.price || item.unit_price || 0),
        quantity: Number(item.quantity || 1)
      }));
    } else if (Array.isArray(order.order_items)) {
      orderItems = order.order_items.map(item => ({
        ...item,
        name: item.name || item.dish_name || t('orders_page.unnamed_item'),
        price: Number(item.price || item.unit_price || 0),
        quantity: Number(item.quantity || 1)
      }));
    }
    
    // Calculate total from items if not provided
    let total = order.total_amount || order.total || 0;
    if ((!total || total === 0) && orderItems.length > 0) {
      total = orderItems.reduce((sum, item) => {
        const price = Number(item.price || item.unit_price || 0);
        const quantity = Number(item.quantity || 1);
        return sum + (price * quantity);
      }, 0);
    }
    
    // Get customer info
    const customerName = order.customer_name || 
                        (order.customer ? (order.customer.name || order.customer.email) : null) || 
                        (order.table_number ? t('orders_page.table') + ` ${order.table_number}` : t('orders_page.guest'));
    
    // Normalize status
    const status = (order.status || 'pending').toLowerCase();
    
    // Normalize timestamps
    const createdAt = order.created_at || order.createdAt || new Date().toISOString();
    const updatedAt = order.updated_at || order.updatedAt || createdAt;
    
    return {
      ...order,
      id: orderId,
      order_number: order.order_number || `#${String(orderId).substring(0, 8)}`,
      items: orderItems,
      total_amount: total,
      status,
      customer_name: customerName,
      created_at: createdAt,
      updated_at: updatedAt,
      table_number: order.table_number || (order.table ? order.table.number : null),
      phone_number: order.phone_number || (order.customer ? order.customer.phone : null),
      notes: order.notes || order.special_instructions
    };
  };

  const fetchOrderItems = async (orderId) => {
    try {
      const orderDetails = await orderAPI.getById(orderId);
      return orderDetails.items || [];
    } catch (error) {
      console.error(`Error fetching items for order ${orderId}:`, error);
      return [];
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // First fetch all orders
      const orders = await orderAPI.getAll();
      
      // Process orders in parallel to fetch their items
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          try {
            // Normalize the order data first
            const normalizedOrder = normalizeOrder(order);
            if (!normalizedOrder) return null;
            
            // If order doesn't have items, try to fetch them
            if (!normalizedOrder.items || normalizedOrder.items.length === 0) {
              const items = await fetchOrderItems(normalizedOrder.id);
              normalizedOrder.items = items;
              
              // Recalculate total if not present
              if ((!normalizedOrder.total_amount || normalizedOrder.total_amount === 0) && items.length > 0) {
                normalizedOrder.total_amount = items.reduce((sum, item) => {
                  const price = Number(item.price || 0);
                  const quantity = Number(item.quantity || 1);
                  return sum + (price * quantity);
                }, 0);
              }
            }
            
            return normalizedOrder;
          } catch (error) {
            console.error(`Error processing order ${order.id}:`, error);
            return null;
          }
        })
      );
      
      // Filter out any null orders and sort by creation date (newest first)
      const validOrders = ordersWithItems
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      
      setOrders(validOrders);
    } catch (error) {
      console.error('Error in fetchOrders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (order) => {
    try {
      // Create a simple receipt content
      const receiptContent = `
        ============================
              ORDER RECEIPT
        ============================
        Order #: ${order.order_number}
        Date: ${new Date(order.created_at).toLocaleString()}
        Status: ${order.status.toUpperCase()}
        ----------------------------
        ITEMS:
        ${order.items.map(item => `
        ${item.quantity}x ${item.name || item.dish_name || t('orders_page.unnamed_item')}
          ${formatCurrency((Number(item.price || item.unit_price || 0) * (Number(item.quantity) || 1)))}
          ${item.notes ? `  Note: ${item.notes}` : ''}
        `).join('')}
        ----------------------------
        TOTAL: ${formatCurrency(order.total_amount || 0)}
        ============================
        ${t('orders_page.thank_you_for_your_order')}
      `;

      // Create a Blob with the receipt content
      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor element to trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${order.order_number || order.id}.txt`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert(t('orders_page.error_generating_receipt'));
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!orderId || !window.confirm(t('orders_page.confirm_delete_order'))) {
      return;
    }
    
    try {
      console.log('Attempting to delete order:', orderId);
      const response = await orderAPI.delete(orderId);
      console.log('Delete response:', response);
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      // Remove the order from the local state
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
      // Close the modal if the deleted order is currently selected
      if (selectedOrder?.id === orderId) {
        setIsModalOpen(false);
      }
      
      alert(t('orders_page.order_deleted_success'));
    } catch (error) {
      console.error('Error deleting order:', error);
      const errorMessage = error.response?.data?.error || error.message || t('orders_page.unknown_error');
      console.error('Error details:', errorMessage);
      alert(`${t('orders_page.error_deleting_order')}: ${errorMessage}`);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    if (!orderId) {
      console.error('Cannot update status: No order ID provided');
      return;
    }
    
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      
      // Optimistically update the UI without refetching all orders
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );
      
      // Also update the selected order if it's the one being updated
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          status: newStatus,
          updated_at: new Date().toISOString()
        }));
      }
      
      // Show success message
      alert(`${t('orders_page.status_updated_to')} ${t(`orders_page.status_${newStatus}`)}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(t('orders_page.error_updating_status'));
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!order) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const orderNumber = order.order_number || '';
    const customerName = order.customer_name || (order.customer ? order.customer.name : '') || '';
    const tableNumber = order.table_number || '';
    const phoneNumber = order.phone_number || (order.customer ? order.customer.phone : '') || '';
    
    const matchesSearch = 
      orderNumber.toString().toLowerCase().includes(searchLower) ||
      customerName.toLowerCase().includes(searchLower) ||
      tableNumber.toString().includes(searchTerm) ||
      phoneNumber.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || 
                         !order.status || 
                         order.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (amount) => {
    // Ensure amount is a valid number
    const value = Number(amount);
    if (isNaN(value)) return '$0.00';
    
    // For whole dollar amounts, show without cents
    if (value % 1 === 0) {
      return `$${value.toFixed(0)}`;
    }
    
    // For amounts less than a dollar, show cents
    if (value > 0 && value < 1) {
      return `$${value.toFixed(2)}`;
    }
    
    // For all other cases, show with 2 decimal places
    return `$${value.toFixed(2)}`;
  };

  const formatDistanceToNow = (dateString) => {
    try {
      if (!dateString) return t('orders_page.just_now');
      
      // Handle both ISO strings and timestamps
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('orders_page.just_now');
      
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return t('orders_page.just_now');
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ${t('orders_page.ago')}`;
      }
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ${t('orders_page.ago')}`;
      }
      
      // For older dates, show the date
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return t('orders_page.just_now');
    }
  };

  const renderOrderDetails = (order) => {
    if (!order) return <div>{t('orders_page.error_order_not_found')}</div>;
    
    // Safely get order ID
    const orderId = order.id || '';
    const orderNumber = order.order_number || `#${String(orderId).substring(0, 8)}`;
    
    // Calculate total from items if not available
    const calculatedTotal = Array.isArray(order.items) ? order.items.reduce((sum, item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 1);
      return sum + (price * quantity);
    }, 0) : 0;
    
    const displayTotal = order.total_amount || calculatedTotal;
    
    return (
      <div className="space-y-3 p-2">
        <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center border-b pb-2`}>
          <h3 className="text-lg font-medium text-gray-900">
            {isRTL ? `${orderNumber} ${t('orders_page.order')}` : `${t('orders_page.order')} ${orderNumber}`}
          </h3>
          <div className="flex space-x-2">
            {order.status !== 'served' && order.status !== 'cancelled' && (
              <button
                onClick={() => handleStatusUpdate(orderId, 'served')}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                {t('orders_page.mark_complete')}
              </button>
            )}
            {order.status === 'pending' && (
              <button
                onClick={() => handleStatusUpdate(orderId, 'cancelled')}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                {t('orders_page.cancel')}
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">{t('orders_page.items')}:</h4>
          {Array.isArray(order.items) && order.items.length > 0 ? (
            <div className="space-y-1">
              {order.items.map((item, idx) => (
                <div key={idx} className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between py-2 border-b border-gray-100`}>
                  <div className="flex-1">
                    <div className="font-medium">
                      {isRTL ? 
                        `${item.name || item.dish_name || t('orders_page.unnamed_item')} ×${item.quantity}` :
                        `${item.quantity}× ${item.name || item.dish_name || t('orders_page.unnamed_item')}`}
                    </div>
                    {item.notes && (
                      <div className={`text-xs text-gray-500 ${isRTL ? 'pr-2' : 'pl-2'} mt-1`}>
                        <span className="font-medium">{t('orders_page.note')}:</span> {item.notes}
                      </div>
                    )}
                  </div>
                  <div className={`${isRTL ? 'mr-4' : 'ml-4'} font-medium`}>
                    {formatCurrency((item.price || item.unit_price || 0) * (item.quantity || 1))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">{t('orders_page.no_items')}</div>
          )}
        </div>
        
        <div className="pt-2 border-t">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between font-semibold text-lg`}>
            <span>{t('orders_page.total')}:</span>
            <span>{formatCurrency(displayTotal)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="font-medium text-gray-700">{t('orders_page.status')}:</div>
            <div className="capitalize">{t(`orders_page.status_${order.status || 'pending'}`)}</div>
          </div>
          
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="font-medium text-gray-700">{t('orders_page.date')}:</div>
            <div>{formatDistanceToNow(new Date(order.created_at))}</div>
          </div>
          
          {(order.table_number || order.address) && (
            <div className={`col-span-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="font-medium text-gray-700">
                {order.table_number 
                  ? t('orders_page.table') 
                  : order.is_external 
                    ? t('orders_page.customer_address') 
                    : t('orders_page.delivery_address')}:
              </div>
              <div>{order.table_number || order.address}</div>
              {order.phone_number && (
                <div className="text-sm text-gray-600">
                  {t('orders_page.phone')}: {order.phone_number}
                </div>
              )}
            </div>
          )}
        </div>
        
        {(order.notes || order.special_instructions) && (
          <div className="text-sm">
            <div className="font-medium text-gray-700">
              {t('orders_page.order_notes')}:
            </div>
            <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">
              {order.notes || order.special_instructions}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`flex flex-col md:flex-row justify-between items-start mb-6 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <h2 className="text-2xl font-bold text-gray-800">{t('orders_page.orders')}</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('orders_page.search_placeholder')}
              className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border rounded-lg w-full`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className={`appearance-none bg-white border rounded-lg ${isRTL ? 'pr-3 pl-8' : 'pl-3 pr-8'} py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('orders_page.all_status')}</option>
              {['pending', 'served', 'cancelled'].map((status) => (
                <option key={status} value={status}>
                  {t(`orders_page.status_${status}`)}
                </option>
              ))}
            </select>
            <div className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-2' : 'right-0 pr-2'} flex items-center pointer-events-none`}>
              <FaFilter className="text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-2xl text-blue-500" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {renderTableHeaders().map((header) => (
                    <th
                      key={header.key}
                      className={header.className}
                      onClick={header.onClick}
                    >
                      {header.content}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOrders.length > 0 ? (
                  sortedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      {renderTableHeaders().map((header) => {
                        switch (header.key) {
                          case 'order_number':
                            return (
                              <td key="order_number" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {order.order_number || `#${String(order.id || '').substring(0, 8)}`}
                              </td>
                            );
                          case 'items':
                            return (
                              <td key="items" className="px-6 py-4 text-sm text-gray-500">
                                {order.items?.length > 0 ? (
                                  <>
                                    {order.items.slice(0, 2).map((item, idx) => (
                                      <div key={idx} className={isRTL ? 'text-right' : 'text-left'}>
                                        {item.quantity}x {item.name || item.dish_name || t('orders_page.unnamed_item')}
                                      </div>
                                    ))}
                                    {order.items.length > 2 && (
                                      <div 
                                        className="text-blue-500 cursor-pointer hover:underline" 
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setIsModalOpen(true);
                                        }}
                                      >
                                        +{order.items.length - 2} {t('common.more')}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400">{t('orders_page.no_items')}</span>
                                )}
                              </td>
                            );
                          case 'customer':
                            return (
                              <td key="customer" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.external_client_id ? (
                                  <span className="inline-flex items-center">
                                    <span className={isRTL ? 'ml-1' : 'mr-1'}>🚚</span>
                                    <span>{t('orders_page.delivery')}</span>
                                  </span>
                                ) : order.table_number ? (
                                  <span className="inline-flex items-center">
                                    <span className={isRTL ? 'ml-1' : 'mr-1'}>🪑</span>
                                    <span>{t('orders_page.table')} {order.table_number}</span>
                                  </span>
                                ) : order.customer_name ? (
                                  <span>{order.customer_name}</span>
                                ) : (
                                  <span className="text-gray-400">{t('orders_page.guest')}</span>
                                )}
                              </td>
                            );
                          case 'total':
                            return (
                              <td key="total" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(order.total_amount)}
                              </td>
                            );
                          case 'time':
                            return (
                              <td key="time" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={new Date(order.created_at).toLocaleString()}>
                                {formatDistanceToNow(parseISO(order.created_at), { addSuffix: true })}
                              </td>
                            );
                          case 'status':
                            return (
                              <td key="status" className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(order.status)}
                              </td>
                            );
                          case 'actions':
                            return (
                              <td key="actions" className={`px-6 py-4 whitespace-nowrap text-${isRTL ? 'left' : 'right'} text-sm font-medium`}>
                                <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                                  <button
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setIsModalOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                    title={t('orders_page.view_order_details')}
                                  >
                                    {t('orders_page.view')}
                                  </button>
                                  <button 
                                    onClick={() => handleDownloadReceipt(order)}
                                    className="text-gray-500 hover:text-gray-700"
                                    title={t('orders_page.print_receipt')}
                                  >
                                    <FaPrint />
                                  </button>
                                </div>
                              </td>
                            );
                          default:
                            return null;
                        }
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      {t('orders_page.no_orders_found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-900">{t('orders_page.order_details')}</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-4">
                {renderOrderDetails(selectedOrder)}
              </div>
              <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
                <div className="order-2 sm:order-1">
                  <button 
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                    className="w-full sm:w-auto px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    {t('orders_page.delete_order')}
                  </button>
                </div>
                <div className={`flex ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'} flex-col sm:flex-row gap-3 order-1 sm:order-2`}>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('orders_page.cancel')}
                  </button>
                  <button 
                    onClick={() => handleDownloadReceipt(selectedOrder)}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <FaPrint className={isRTL ? 'ml-2' : 'mr-2'} />
                    {t('orders_page.print_receipt')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
