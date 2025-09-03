import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { statisticsAPI } from '../../utils/api';
import { Line, Bar, Doughnut, Chart } from 'react-chartjs-2';
import { 
  FaUtensils, 
  FaMoneyBillWave, 
  FaUsers, 
  FaChartLine, 
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaStar
} from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Register Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsTab = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date()
  });
  const [orderStats, setOrderStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    preparing_orders: 0,
    served_orders: 0,
    cancelled_orders: 0,
    internal_orders: 0,
    external_orders: 0,
    changes: {
      total_orders: 0,
      internal_orders: 0,
      external_orders: 0
    }
  });
  const [popularDishes, setPopularDishes] = useState([]);
  const [revenueData, setRevenueData] = useState({
    daily_data: [],
    total_revenue: 0,
    revenue_change: 0
  });
  const [error, setError] = useState(null);
  const chartRefs = useRef({});

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        start_date: formatDate(dateRange.startDate),
        end_date: formatDate(dateRange.endDate)
      };

      // Fetch order statistics with changes
      const orderStats = await statisticsAPI.getOrderAnalytics(params);
      setOrderStats(prev => ({
        ...prev,
        ...orderStats
      }));

      // Fetch popular dishes
      const dishes = await statisticsAPI.getPopularDishes(10);
      setPopularDishes(Array.isArray(dishes) ? dishes : []);

      // Fetch revenue data with changes
      const revenue = await statisticsAPI.getRevenue(params);
      setRevenueData({
        daily_data: Array.isArray(revenue.daily_data) ? revenue.daily_data : [],
        total_revenue: revenue.total_revenue || 0,
        revenue_change: revenue.revenue_change || 0
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(t('analytics_page.error_fetching_analytics'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const revenueChartData = {
    labels: revenueData.daily_data.length > 0 ? revenueData.daily_data.map(item => item.order_date) : [],
    datasets: [
      {
        label: t('revenue'),
        data: revenueData.daily_data.length > 0 ? revenueData.daily_data.map(item => item.daily_revenue) : [0],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
          return gradient;
        },
        tension: 0.3,
        fill: {
          target: 'origin',
          above: 'rgba(59, 130, 246, 0.1)'
        }
      }
    ]
  };

  const ordersChartData = {
    labels: revenueData.daily_data.map(item => item.order_date),
    datasets: [
      {
        label: t('orders'),
        data: revenueData.daily_data.map(item => item.orders_count),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4
      }
    ]
  };

  const orderStatusData = {
    labels: [t('analytics_page.pending'), t('analytics_page.served'), t('analytics_page.cancelled')],
    datasets: [
      {
        data: [
          orderStats?.pending_orders || 0,
          orderStats?.served_orders || 0,
          orderStats?.cancelled_orders || 0
        ],
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold">{t('analytics_page.select_date_range')}</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-gray-500" />
              <DatePicker
                selected={dateRange.startDate}
                onChange={(date) => setDateRange({...dateRange, startDate: date})}
                selectsStart
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                className="border rounded p-2 w-full sm:w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-gray-500" />
              <DatePicker
                selected={dateRange.endDate}
                onChange={(date) => setDateRange({...dateRange, endDate: date})}
                selectsEnd
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                minDate={dateRange.startDate}
                className="border rounded p-2 w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<FaUtensils className="text-blue-500" />} 
          title={t('analytics_page.total_orders')}
          value={orderStats?.total_orders || 0}
          change={orderStats?.changes?.total_orders || 0}
          trend={orderStats?.changes?.total_orders >= 0 ? "up" : "down"}
        />
        <StatCard 
          icon={<FaMoneyBillWave className="text-green-500" />} 
          title={t('analytics_page.total_revenue')}
          value={`${Number(revenueData.total_revenue || 0).toFixed(2)} DZD`}
          change={Number(revenueData.revenue_change || 0)}
          trend={Number(revenueData.revenue_change || 0) >= 0 ? "up" : "down"}
        />
        <StatCard 
          icon={<FaUsers className="text-purple-500" />} 
          title={t('analytics_page.internal_orders')}
          value={orderStats?.internal_orders || 0}
          change={orderStats?.changes?.internal_orders || 0}
          trend={orderStats?.changes?.internal_orders >= 0 ? "up" : "down"}
        />
        <StatCard 
          icon={<FaChartLine className="text-yellow-500" />} 
          title={t('analytics_page.external_orders')}
          value={orderStats?.external_orders || 0}
          change={orderStats?.changes?.external_orders || 0}
          trend={orderStats?.changes?.external_orders >= 0 ? "up" : "down"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">{t('analytics_page.revenue_over_time')}</h3>
          <div className="h-64">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        {/* Order Status Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">{t('analytics_page.order_status')}</h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={orderStatusData} 
              options={{
                ...chartOptions,
                plugins: {
                  legend: {
                    position: 'right'
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Popular Dishes */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4">{t('analytics_page.popular_dishes')}</h3>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y divide-gray-200 ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <thead className="bg-gray-50">
              <tr>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('analytics_page.dish')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('analytics_page.menu')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('analytics_page.section')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('analytics_page.price')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('analytics_page.times_ordered')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('analytics_page.total_quantity')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {popularDishes.map((dish) => (
                <tr key={dish.id}>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm font-medium text-gray-900">{dish.name}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm text-gray-900">{dish.menu_name || t('analytics_page.not_available')}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm text-gray-900">
                      {dish.section_name ? t(dish.section_name.toLowerCase()) : t('analytics_page.not_available')}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm text-gray-900">{dish.price} DZD</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm text-gray-900">{dish.times_ordered}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm text-gray-900">{dish.total_ordered}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, change, trend }) => {
  const { t } = useTranslation();
  const getChangeColor = (trend) => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-gray-500';
  };
  
  // Format change percentage
  const formatChange = (change) => {
    if (change === 0) return t('analytics_page.no_change');
    return `${Math.abs(change).toFixed(1)}%`;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div className="p-3 rounded-full bg-opacity-10 bg-blue-100">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <div className={`text-sm ${getChangeColor(trend)} flex items-center justify-end`}>
            {trend === 'up' && change > 0 && <FaArrowUp className="mr-1" />}
            {trend === 'down' && change < 0 && <FaArrowDown className="mr-1" />}
            {change !== 0 && (
              <>
                {trend === 'up' && <FaArrowUp className="mr-1" />}
                {trend === 'down' && <FaArrowDown className="mr-1" />}
                {formatChange(change)}
              </>
            )}
            {change === 0 && <span className="text-gray-500">{t('analytics_page.no_change')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;