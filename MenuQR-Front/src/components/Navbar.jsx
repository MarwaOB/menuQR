import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI } from '../utils/api';
import MyButton from './UI/Button';
import { FaUser, FaSignOutAlt, FaGlobe } from 'react-icons/fa';
import i18n from '../utils/i18n.js';

const Navbar = () => {
  const { t, i18n: i18nextInstance } = useTranslation();
  const { user, logout } = useAuth();
  const currentLang = i18nextInstance.language;
  const [restaurantName, setRestaurantName] = useState(t('restaurant_name')); // fallback

  // Fetch restaurant information
  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      try {
        const data = await restaurantAPI.getProfile();
        setRestaurantName(data.name || t('restaurant_name'));
      } catch (error) {
        console.error('Error fetching restaurant info:', error);
        // Keep fallback name
      }
    };

    if (user) {
      fetchRestaurantInfo();
    }
  }, [t, user]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <nav className="bg-white shadow-md fixed w-full z-10 h-16">
      <div className="flex flex-row items-center justify-between max-w-6xl mx-auto px-4 py-3">
        <h1 className="text-lg font-semibold">{restaurantName}</h1>

        <div className="flex items-center gap-3">
          {/* User Info */}
          {user && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FaUser className="text-gray-400" />
              <span>{user.email}</span>
            </div>
          )}

          {/* Language Toggle */}
          <MyButton
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white"
          >
            <FaGlobe className="text-sm text-white" />
            {currentLang === 'en' ? 'ع' : 'En'}
          </MyButton>

          {/* Logout Button */}
          {user && (
            <MyButton
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
            >
              <FaSignOutAlt className="text-sm" />
              {t('logout', 'Logout')}
            </MyButton>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
