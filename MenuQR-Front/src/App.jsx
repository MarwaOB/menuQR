import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import SettingsTab from './components/dashboard/SettingsTab';
import OrdersTab from './components/dashboard/OrdersTab';
import MenusTab from './components/dashboard/MenusTab';
import AnalyticsTab from './components/dashboard/AnalyticsTab';
import MenuDetailsPage from './pages/MenuDetailsPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route path="settings" element={<SettingsTab />} />
          <Route path="orders" element={<OrdersTab />} />
          <Route path="menus" element={<MenusTab />} />
          <Route path="analytics" element={<AnalyticsTab />} />

          <Route path="menus/:id" element={<MenuDetailsPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
