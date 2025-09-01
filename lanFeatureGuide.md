Step 1: Set Up Restaurant PC
You said restaurant can have a PC. Perfect! Here's what to do:
bash# On the restaurant PC:
1. Install Node.js
2. Copy your entire React app to this PC
3. Run: npm install
4. Run: npm start (or npm run build + serve)
5. Make sure it runs on port for example 3000


Step 2: Network Setup (Restaurant Router)
You need to configure the restaurant's WiFi router:
1. Access router admin panel (usually 192.168.1.1)
2. Find "DHCP Reservation" or "Static IP" settings
3. Assign the restaurant PC a fixed IP: 192.168.1.100
4. Make sure port 3000 is open for local network access


Important: You don't need internet for customers to use the local app, but the PC needs internet initially to sync data with your main server.

