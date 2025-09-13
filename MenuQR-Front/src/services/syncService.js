import { syncOrderAPI } from '../utils/syncApi';
import config from '../config';

class SyncService {
  constructor() {
    this.SYNC_INTERVAL = config.SYNC_INTERVAL;
    this.lastSyncTime = localStorage.getItem(config.LAST_SYNC_KEY) || 0;
    this.syncInProgress = false;
    this.retryCount = 0;
    this.maxRetries = config.MAX_SYNC_RETRIES;
    this.syncListeners = [];
  }

  // Add a sync status change listener
  addSyncListener(callback) {
    if (typeof callback === 'function') {
      this.syncListeners.push(callback);
      return () => {
        this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
      };
    }
  }

  // Notify all listeners about sync status changes
  notifyListeners(status, data = {}) {
    this.syncListeners.forEach(callback => {
      try {
        callback({ status, ...data });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Process a single order with retry logic
  async processOrder(order) {
    const maxRetries = this.maxRetries;
    let attempt = 0;
    
    try {
      // Make sure we have the required fields
      if (!order.table_number) {
        console.error('Order is missing table_number:', order);
        throw new Error('table_number is required');
      }
      
      // Create a new client for the table in the deployed database
      let deployedClientId;
      try {
        console.log('Creating new client for table', order.table_number);
        const deployedClientResponse = await fetch('https://menuqr-i2a0.onrender.com/api/order/clients/internal/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table_number: order.table_number
          })
        });
        
        if (deployedClientResponse.ok) {
          const deployedClientData = await deployedClientResponse.json();
          deployedClientId = deployedClientData.client_id || deployedClientData.id;
          console.log('Created client in deployed database with ID:', deployedClientId);
        } else {
          const error = await deployedClientResponse.json().catch(() => ({}));
          console.warn('Failed to create client in deployed database:', error);
          // Continue with local client ID if available
          if (order.client_id) {
            deployedClientId = order.client_id;
            console.log('Using local client ID as fallback:', deployedClientId);
          } else {
            throw new Error('Failed to create client and no fallback available');
          }
        }
      } catch (error) {
        console.error('Error handling client in deployed database:', error);
        if (order.client_id) {
          deployedClientId = order.client_id;
          console.log('Using local client ID after error:', deployedClientId);
        } else {
          throw new Error('Failed to handle client in deployed database: ' + error.message);
        }
      }
      
      // Use the menu_id from the order data
      const orderData = {
        menu_id: order.menu_id, // Use the menu_id from the order
        client_id: deployedClientId, // Use the client ID from the deployed database
        client_type: 'internal',
        table_number: order.table_number,
        dishes: (order.dishes || []).map(dish => ({
          dish_id: dish.dish_id || dish.id,
          quantity: dish.quantity
        }))
      };
      
      console.log('Prepared order data for sync:', JSON.stringify(orderData, null, 2));
      
      while (attempt < maxRetries) {
        try {
          this.notifyListeners('syncing', { orderId: order.localOrderId, attempt: attempt + 1 });
          
          // Use the sync API to send to deployed backend
          const response = await syncOrderAPI.create(orderData);
          
          // If we get here, the sync was successful
          console.log(`Order ${order.localOrderId} synced successfully to deployed backend`);
          return { 
            success: true, 
            orderId: order.localOrderId,
            remoteId: response.id // Store the remote ID if needed
          };
        } catch (error) {
          console.error(`Sync attempt ${attempt + 1} failed for order ${order.localOrderId}:`, error);
          attempt++;
          
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s, etc.
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Final attempt failed
            console.error(`All ${maxRetries} sync attempts failed for order ${order.localOrderId}`);
          }
        }
      }
      
      return { 
        success: false, 
        orderId: order.localOrderId, 
        error: 'Max retries reached' 
      };
    } catch (error) {
      console.error('Error in processOrder:', error);
      return {
        success: false,
        orderId: order.localOrderId,
        error: error.message
      };
    }
  }

  // Check for pending orders and sync them
  async syncPendingOrders() {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }
    
    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync');
      this.notifyListeners('offline');
      return;
    }
    
    const pendingOrders = this.getPendingOrders();
    if (pendingOrders.length === 0) {
      this.notifyListeners('idle');
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners('syncing', { total: pendingOrders.length });
    
    try {
      const results = [];
      
      // Process orders in sequence to maintain order and avoid conflicts
      for (const order of pendingOrders) {
        const result = await this.processOrder(order);
        results.push(result);
      }
      
      // Process results
      const successfulSyncs = results
        .filter(r => r.success)
        .map(r => r.orderId);
      
      // Remove successfully synced orders
      if (successfulSyncs.length > 0) {
        this.removeSyncedOrders(successfulSyncs);
        this.lastSyncTime = Date.now();
        localStorage.setItem(config.LAST_SYNC_KEY, this.lastSyncTime);
      }
      
      // Check for any failed syncs
      const failedSyncs = results.filter(r => !r.success);
      if (failedSyncs.length > 0) {
        console.warn(`Failed to sync ${failedSyncs.length} orders`);
        this.notifyListeners('error', { failed: failedSyncs.length });
      } else {
        this.notifyListeners('success', { synced: successfulSyncs.length });
      }
      
      return { success: true, synced: successfulSyncs.length, failed: failedSyncs.length };
    } catch (error) {
      console.error('Error during sync:', error);
      this.notifyListeners('error', { error: error.message });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get all pending orders from local storage
  getPendingOrders() {
    return JSON.parse(localStorage.getItem(config.OFFLINE_STORAGE_KEY) || '[]');
  }

  // Remove synced orders from local storage
  removeSyncedOrders(orderIds) {
    const pendingOrders = this.getPendingOrders();
    const updatedPending = pendingOrders.filter(
      order => !orderIds.includes(order.localOrderId)
    );
    localStorage.setItem(config.OFFLINE_STORAGE_KEY, JSON.stringify(updatedPending));
    return updatedPending;
  }

  // Add order to pending sync
  addPendingOrder(order) {
    const pendingOrders = this.getPendingOrders();
    const localOrderId = `local_${Date.now()}`;
    const pendingOrder = {
      ...order,
      localOrderId,
      createdAt: new Date().toISOString(),
      lastAttempt: null,
      status: 'pending',
      retryCount: 0,
      // Explicitly include all required fields to ensure they're not lost
      menu_id: order.menu_id,
      client_id: order.client_id,
      client_type: order.client_type || 'internal',
      table_number: order.table_number,
      dishes: order.dishes || []
    };
    
    console.log('Adding pending order:', JSON.stringify(pendingOrder, null, 2));
    
    pendingOrders.push(pendingOrder);
    localStorage.setItem(config.OFFLINE_STORAGE_KEY, JSON.stringify(pendingOrders));
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      console.log('Online - attempting to sync pending orders...');
      this.syncPendingOrders().catch(error => {
        console.error('Error during initial sync attempt:', error);
      });
    } else {
      console.log('Offline - order queued for later sync');
    }
    
    return localOrderId;
  }

  // Get sync status
  getSyncStatus() {
    const pendingOrders = this.getPendingOrders();
    const lastSync = this.lastSyncTime ? new Date(parseInt(this.lastSyncTime, 10)) : null;
    
    return {
      isSyncing: this.syncInProgress,
      lastSync,
      pendingCount: pendingOrders.length,
      isOnline: navigator.onLine
    };
  }

  // Start automatic syncing
  startAutoSync() {
    // Initial sync
    this.syncPendingOrders().catch(console.error);
    
    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncPendingOrders().catch(console.error);
    }, this.SYNC_INTERVAL);
    
    // Listen for online/offline events
    this.handleOnline = () => {
      console.log('Network connection restored, syncing...');
      this.syncPendingOrders().catch(console.error);
    };
    
    window.addEventListener('online', this.handleOnline);
  }

  // Stop automatic syncing
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.handleOnline) {
      window.removeEventListener('online', this.handleOnline);
    }
    
    this.syncInProgress = false;
  }
}

export const syncService = new SyncService();
