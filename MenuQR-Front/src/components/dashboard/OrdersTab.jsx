import React, { useState, useEffect } from 'react';
import { orderAPI } from '../../utils/api';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { FaSearch, FaFilter, FaSort, FaCheck, FaTimes, FaSpinner, FaPrint } from 'react-icons/fa';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-purple-100 text-purple-800',
  served: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  // Map old statuses to new ones for backward compatibility
  confirmed: 'bg-purple-100 text-purple-800', // Map to preparing
  ready: 'bg-green-100 text-green-800',       // Map to served
  completed: 'bg-gray-100 text-gray-800',     // Map to served
};

export default function OrdersTab() {
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
  const normalizeOrder = (order) => {
    if (!order) return null;
    
    // Ensure we have a valid ID
    const orderId = order.id || order._id || `order-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get items, handling both items and order_items formats
    let orderItems = [];
    if (Array.isArray(order.items)) {
      orderItems = order.items.map(item => ({
        ...item,
        name: item.name || item.dish_name || 'Unnamed Item',
        price: Number(item.price || item.unit_price || 0),
        quantity: Number(item.quantity || 1)
      }));
    } else if (Array.isArray(order.order_items)) {
      orderItems = order.order_items.map(item => ({
        ...item,
        name: item.name || item.dish_name || 'Unnamed Item',
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
                        (order.table_number ? `Table ${order.table_number}` : 'Guest');
    
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
        ${item.quantity}x ${item.name || item.dish_name || 'Item'}
          ${formatCurrency((Number(item.price || item.unit_price || 0) * (Number(item.quantity) || 1)))}
          ${item.notes ? `  Note: ${item.notes}` : ''}
        `).join('')}
        ----------------------------
        TOTAL: ${formatCurrency(order.total_amount || 0)}
        ============================
        Thank you for your order!
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
      alert('Failed to generate receipt. Please try again.');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!orderId || !window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
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
      
      alert('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      console.error('Error details:', errorMessage);
      alert(`Failed to delete order: ${errorMessage}`);
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
      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
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
      if (!dateString) return 'Just now';
      
      // Handle both ISO strings and timestamps
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Just now';
      
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ago`;
      }
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ago`;
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
      return 'Just now';
    }
  };

  const getStatusBadge = (status) => {
    if (!status) status = 'pending';
    
    // Map old statuses to new ones
    const statusMapping = {
      confirmed: 'preparing',
      ready: 'served',
      completed: 'served',
    };
    
    // Normalize status to one of the expected values
    const normalizedStatus = statusMapping[status] || status;
    
    const statusIcons = {
      pending: '⏳',
      preparing: '👨‍🍳',
      served: '✅',
      cancelled: '❌',
    };
    
    const statusLabels = {
      pending: 'Pending',
      preparing: 'Preparing',
      served: 'Served',
      cancelled: 'Cancelled',
    };
    
    const icon = statusIcons[normalizedStatus] || '📋';
    const label = statusLabels[normalizedStatus] || normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
    
    return (
      <span
        className={`px-2 py-1 inline-flex items-center text-xs font-semibold rounded-full ${statusColors[normalizedStatus] || 'bg-gray-100'}`}
        title={label}
      >
        <span className="mr-1">{icon}</span>
        {label}
      </span>
    );
  };

  const renderOrderDetails = (order) => {
    if (!order) return <div>Error: Order not found</div>;
    
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
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-semibold">Order {orderNumber}</h3>
          <div className="flex space-x-2">
            {order.status !== 'served' && order.status !== 'cancelled' && (
              <button
                onClick={() => handleStatusUpdate(orderId, 'served')}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                Mark Complete
              </button>
            )}
            {order.status === 'pending' && (
              <button
                onClick={() => handleStatusUpdate(orderId, 'cancelled')}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Items:</h4>
          {Array.isArray(order.items) && order.items.length > 0 ? (
            <div className="space-y-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.quantity}x {item.name}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-gray-500 pl-2 mt-1">
                        <span className="font-medium">Note:</span> {item.notes}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">No items in this order</div>
          )}
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span>{formatCurrency(displayTotal)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-700">Status:</div>
            <div className="capitalize">{order.status || 'pending'}</div>
          </div>
          
          <div>
            <div className="font-medium text-gray-700">Date:</div>
            <div>{formatDistanceToNow(order.created_at)}</div>
          </div>
          
          {(order.table_number || order.address) && (
            <div className="col-span-2">
              <div className="font-medium text-gray-700">
                {order.table_number ? 'Table' : order.is_external ? 'Customer Address' : 'Delivery Address'}:
              </div>
              <div>{order.table_number || order.address}</div>
              {order.phone_number && (
                <div className="text-sm text-gray-600">Phone: {order.phone_number}</div>
              )}
            </div>
          )}
        </div>
        
        {(order.notes || order.special_instructions) && (
          <div className="text-sm">
            <div className="font-medium text-gray-700">Order Notes:</div>
            <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">
              {order.notes || order.special_instructions}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Orders</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-10 pr-4 py-2 border rounded-lg w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="appearance-none bg-white border rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              {['pending', 'served', 'cancelled'].map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('order_number')}
                  >
                    <div className="flex items-center">
                      Order #
                      <FaSort className="ml-1" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('total_amount')}
                  >
                    <div className="flex items-center">
                      Total
                      <FaSort className="ml-1" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Time
                      <FaSort className="ml-1" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOrders.length > 0 ? (
                  sortedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.order_number || `#${String(order.id || '').substring(0, 8)}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {order.items?.length > 0 ? (
                          <>
                            {order.items.slice(0, 2).map((item, idx) => (
                              <div key={idx}>
                                {item.quantity}x {item.name || item.dish_name || 'Item'}
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
                                +{order.items.length - 2} more
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">No items</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.external_client_id ? (
                          <span className="inline-flex items-center">
                            <span className="text-orange-500 mr-1">🚚</span>
                            <span>Delivery</span>
                          </span>
                        ) : order.table_number ? (
                          <span className="inline-flex items-center">
                            <span className="text-blue-500 mr-1">🪑</span>
                            <span>Table {order.table_number}</span>
                          </span>
                        ) : order.customer_name ? (
                          <span>{order.customer_name}</span>
                        ) : (
                          <span className="text-gray-400">Guest</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={new Date(order.created_at).toLocaleString()}>
                        {formatDistanceToNow(parseISO(order.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View order details"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleDownloadReceipt(order)}
                            className="text-gray-500 hover:text-gray-700"
                            title="Print receipt"
                          >
                            <FaPrint />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      No orders found
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
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
              <div className="mt-6 flex justify-between">
                <div>
                  <button 
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                    className="px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete Order
                  </button>
                </div>
                <div className="space-x-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => handleDownloadReceipt(selectedOrder)}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <FaPrint className="inline mr-2" />
                    Download Receipt
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
