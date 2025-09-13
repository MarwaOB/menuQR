# Local Menu System Setup Guide

## 1. Set Up Local Server
1. On the restaurant PC, install Node.js
2. Clone your repository:
   ```bash
   git clone <your-repo-url>
   cd <project-folder>
   ```
3. Update the IP address in the code:
   - Open `src/config.js`
   - Change `API_BASE_URL` to your local IP (e.g., `http://192.168.1.100:3000`)
   - Change `FRONTEND_BASE_URL` to match (e.g., `http://192.168.1.100:3001`)

4. Install dependencies and start:
   ```bash
   npm install
   npm run build
   npm start
   ```

## 2. Network Configuration
1. Access your router (usually 192.168.1.1)
2. Assign a static IP to the PC (e.g., 192.168.1.100)
3. Ensure ports 3000 (API) and 3001 (frontend) are open

## 3. How Orders Work

### Local Order Flow:
1. Customer places order on local network
2. Order is saved to local database
3. Receipt is printed in kitchen
4. Order appears on local dashboard

### Sync Process:
1. When internet is available, the system checks for pending orders
2. Each order is sent to the online server
3. Once confirmed by server, order is marked as synced
4. Sync happens every 10 minutes when online

### Offline Mode:
- Orders are stored locally
- Queue for syncing when back online
- No data loss during internet outages

