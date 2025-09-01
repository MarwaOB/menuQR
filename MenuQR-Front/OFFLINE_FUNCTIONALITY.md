# MenuQR Offline Functionality

## Overview

MenuQR now supports offline functionality for customers who are physically present in the restaurant. This allows customers to view menus and place orders even when they're connected to the restaurant's local WiFi network without internet access.

## How It Works

### 1. QR Code Generation
- **Single QR Code**: Instead of generating individual QR codes for each menu, the system now generates one QR code that points to `/menu/current`
- **Current Menu**: The QR code always directs customers to the restaurant's current active menu
- **Universal Access**: The same QR code works for all customers and all menus

### 2. Customer Experience

#### Online Mode (Internet Available)
- Customers can access the full menu with real-time updates
- Orders are processed immediately through the API
- All features work normally

#### Offline Mode (Local WiFi Only)
- Menu data is cached in the browser's localStorage
- Customers can still browse the menu and add items to cart
- Orders are stored locally and synced when internet connection is restored
- Full functionality maintained without internet dependency

### 3. Technical Implementation

#### Service Worker (`/public/sw.js`)
- Caches essential resources for offline access
- Handles background sync for offline orders
- Provides fallback content when offline

#### Progressive Web App (PWA)
- `manifest.json` enables app-like installation
- Customers can "install" the menu app on their devices
- Works like a native app with offline capabilities

#### Local Storage
- Menu data is cached automatically when accessed online
- Offline orders are stored locally until sync is possible
- Automatic data synchronization when connection is restored

## Usage Instructions

### For Restaurant Staff
1. **Generate QR Code**: Create a menu and download the generated QR code
2. **Display QR Code**: Place the QR code on tables, walls, or menus
3. **No Internet Required**: Customers can use the app even on local WiFi

### For Customers
1. **Scan QR Code**: Use any QR code scanner app
2. **Connect to WiFi**: Join the restaurant's local WiFi network
3. **Browse Menu**: View dishes, categories, and prices
4. **Add to Cart**: Select items and quantities
5. **Place Order**: Enter table number and submit order
6. **Offline Support**: Works even without internet connection

## Features

### ✅ Available Offline
- Menu browsing and dish viewing
- Category filtering
- Shopping cart functionality
- Order placement (stored locally)
- Basic navigation

### ✅ Available Online Only
- Real-time menu updates
- Immediate order processing
- Push notifications
- Analytics and tracking

## Technical Requirements

### Browser Support
- Modern browsers with Service Worker support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Network Configuration
- Restaurant WiFi network (no internet required)
- Local network access to the MenuQR backend
- DNS resolution for the restaurant's domain

## Benefits

1. **No Internet Dependency**: Works on local WiFi networks
2. **Better Customer Experience**: Fast, responsive menu browsing
3. **Reduced Data Usage**: Menu data cached locally
4. **Reliable Ordering**: Orders stored locally until sync
5. **Professional Appearance**: App-like experience for customers

## Troubleshooting

### Common Issues

#### QR Code Not Working
- Ensure the QR code points to `/menu/current`
- Check that the customer route is properly configured
- Verify the backend is accessible on the local network

#### Offline Mode Not Working
- Check if Service Worker is registered (browser console)
- Verify localStorage is available and not blocked
- Ensure the app has been accessed online at least once

#### Orders Not Syncing
- Check internet connection status
- Verify the backend API is accessible
- Check browser console for sync errors

### Debug Mode
- Open browser developer tools
- Check Console tab for error messages
- Verify Service Worker registration in Application tab
- Check localStorage contents for cached data

## Future Enhancements

1. **Push Notifications**: Real-time order updates
2. **Offline Payment**: Local payment processing
3. **Menu Caching**: Automatic background menu updates
4. **Multi-language Support**: Offline translation support
5. **Analytics**: Offline usage tracking and reporting
