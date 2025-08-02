'use client';

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DashboardTabs from '../components/DashboardTabs';

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      <main className="pt-20 px-4 max-w-6xl mx-auto space-y-6">
        <DashboardTabs activePath={location.pathname} onTabClick={(path) => navigate(path)} />

        <div className="bg-white p-6 rounded-xl shadow min-h-[300px] transition-all duration-300">
            <Outlet />
        </div>

      </main>
    </>
  );
};

export default DashboardLayout;
