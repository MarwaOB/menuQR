import React from 'react';
import { useTranslation } from 'react-i18next';
import MyButton from './UI/Button';
import { FaGlobe } from 'react-icons/fa';
import i18n from '../utils/i18n.js';

const Navbar = () => {
  const { t, i18n: i18nextInstance } = useTranslation();
  const currentLang = i18nextInstance.language;

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <nav className="bg-white shadow-md fixed w-full z-10 h-16">
      <div className="flex flex-row items-center justify-between max-w-6xl mx-auto px-4 py-3">
        <h1 className="text-lg font-semibold">{t('restaurant_name')}</h1>

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
