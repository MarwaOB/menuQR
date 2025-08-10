import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import SettingsTab from './components/dashboard/SettingsTab';
import OrdersTab from './components/dashboard/OrdersTab';
import MenusTab from './components/dashboard/MenusTab';
import AnalyticsTab from './components/dashboard/AnalyticsTab';
import MenuDetailsPage from './pages/MenuDetailsPage';
import AddNewMenuPage from './pages/AddNewMenuPage';
import CreateFromExisting from './pages/CreateFromExisting';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/menus" replace />} />
            <Route path="settings" element={<SettingsTab />} />
            <Route path="orders" element={<OrdersTab />} />
            <Route path="menus" element={<MenusTab />} />
            <Route path="analytics" element={<AnalyticsTab />} />
            <Route path="menus/:id" element={<MenuDetailsPage />} />
            <Route path="menus/newScratch" element={<AddNewMenuPage />} />
            <Route path="menus/newExisting" element={<CreateFromExisting />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
