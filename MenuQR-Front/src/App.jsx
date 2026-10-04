import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Route-level code splitting: customers never download the admin (charts,
// NextUI…) and staff never download the 3D home page.
const HomePage = lazy(() => import('./pages/HomePage'));
const CustomerMenuPage = lazy(() => import('./pages/CustomerMenuPage'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const SettingsTab = lazy(() => import('./components/dashboard/SettingsTab'));
const OrdersTab = lazy(() => import('./components/dashboard/OrdersTab'));
const MenusTab = lazy(() => import('./components/dashboard/MenusTab'));
const AnalyticsTab = lazy(() => import('./components/dashboard/AnalyticsTab'));
const MenuDetailsPage = lazy(() => import('./pages/MenuDetailsPage'));
const AddNewMenuPage = lazy(() => import('./pages/AddNewMenuPage'));
const CreateFromExisting = lazy(() => import('./pages/CreateFromExisting'));

function PageFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-cream" role="status" aria-live="polite">
      <span className="h-px w-24 overflow-hidden bg-line">
        <span className="block h-full w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] bg-paprika" />
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public marketing home */}
            <Route path="/" element={<HomePage />} />

            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected admin routes (same URLs as before: /menus, /orders, …) */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Navigate to="/menus" replace />} />
              <Route path="settings" element={<SettingsTab />} />
              <Route path="orders" element={<OrdersTab />} />
              <Route path="menus" element={<MenusTab />} />
              <Route path="analytics" element={<AnalyticsTab />} />
              <Route path="menus/:id" element={<MenuDetailsPage />} />
              <Route path="menus/newScratch" element={<AddNewMenuPage />} />
              <Route path="menus/newExisting" element={<CreateFromExisting />} />
            </Route>

            {/* Public customer ordering */}
            <Route path="/menu/order" element={<CustomerMenuPage />} />
            <Route path="/menu/current" element={<CustomerMenuPage />} />
            <Route path="/menu/:id" element={<CustomerMenuPage />} />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
};

export default App;
