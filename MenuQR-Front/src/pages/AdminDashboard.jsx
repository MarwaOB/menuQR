import React from 'react';
import Navbar from '../components/Navbar';
import DashboardTabs from '../components/dashboard/DashboardTabs';

export default function AdminDashboard() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <main className="pt-16 px-4">
        <DashboardTabs />
      </main>
    </div>
  );
}
