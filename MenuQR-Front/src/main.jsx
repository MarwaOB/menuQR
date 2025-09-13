import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import './utils/i18n';
import { syncService } from './services/syncService';

// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered: ', registration);
        // Start sync service after service worker is registered
        syncService.startAutoSync();
      })
      .catch((registrationError) => {
        console.log('Service Worker registration failed: ', registrationError);
      });
  });
}

// Listen for online/offline events
const handleOnline = () => {
  console.log('Application is online, syncing data...');
  syncService.syncPendingOrders();
};

const handleOffline = () => {
  console.log('Application is offline, will sync when back online');};

// Add event listeners
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

// Initial sync check
if (navigator.onLine) {
  syncService.syncPendingOrders();
}

// Cleanup function
const cleanup = () => {
  syncService.stopAutoSync();
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
};

// Initialize the app
const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Clean up on unmount
window.addEventListener('beforeunload', cleanup);
