import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MyButton from './UI/Button';
import { FaGlobe } from 'react-icons/fa';
import i18n from '../utils/i18n.js';

const Navbar = () => {
  const { t, i18n: i18nextInstance } = useTranslation();
  const currentLang = i18nextInstance.language;
  const [restaurantName, setRestaurantName] = useState(t('restaurant_name')); // fallback

  // Fetch restaurant information
  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/restaurant/profile');
        if (response.ok) {
          const data = await response.json();
          setRestaurantName(data.name || t('restaurant_name'));
        } else {
          console.warn('Failed to fetch restaurant profile, using fallback name');
        }
      } catch (error) {
        console.error('Error fetching restaurant info:', error);
        // Keep fallback name
      }
    };

    fetchRestaurantInfo();
  }, [t]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <nav className="bg-white shadow-md fixed w-full z-10 h-16">
      <div className="flex flex-row items-center justify-between max-w-6xl mx-auto px-4 py-3">
        <h1 className="text-lg font-semibold">{restaurantName}</h1>

        <div className="flex items-center gap-3">
          <MyButton
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white"
          >
            <FaGlobe className="text-sm text-white" />
            {currentLang === 'en' ? 'ع' : 'En'}
          </MyButton>

          <MyButton className="bg-red-400 hover:bg-red-500 text-white">
            {t('logout')}
          </MyButton>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
