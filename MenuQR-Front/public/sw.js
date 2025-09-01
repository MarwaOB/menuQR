const CACHE_NAME = 'menuQR-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return offline page
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
      })
  );
});

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

// Sync offline orders when back online
async function syncOfflineOrders() {
  try {
    const offlineOrders = JSON.parse(localStorage.getItem('offlineOrders') || '[]');
    
    if (offlineOrders.length === 0) return;

    for (const order of offlineOrders) {
      try {
        // Try to send the order to the server
        const response = await fetch('/api/order/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            menu_id: order.menuId,
            client_id: order.clientId,
            client_type: order.clientType,
            dishes: order.dishes
          })
        });

        if (response.ok) {
          // Remove successful order from offline storage
          const updatedOrders = offlineOrders.filter(o => o.id !== order.id);
          localStorage.setItem('offlineOrders', JSON.stringify(updatedOrders));
        }
      } catch (error) {
        console.error('Failed to sync order:', error);
      }
    }
  } catch (error) {
    console.error('Error syncing offline orders:', error);
  }
}

// Push notification for new orders (if implemented)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New order received!',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('MenuQR', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
