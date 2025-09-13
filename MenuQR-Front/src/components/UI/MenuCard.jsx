'use client';

import React from 'react';
import MyButton from './Button';
import { FaTrash, FaEye } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const MenuCard = ({ name, date, onSeeMore, onDelete }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Format the date according to the current locale
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition gap-3"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className={`w-full md:w-auto ${isRTL ? 'md:text-right' : 'md:text-left'}`}>
        <p className="text-gray-700 font-semibold">
          {t('menu')} #{name}
        </p>
        <p className="text-sm text-gray-500">
          {t('created_on')}: {formatDate(date)}
        </p>
      </div>

      <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 w-full md:w-auto justify-end`}>
        <MyButton
          onClick={onSeeMore}
          className={`bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 text-sm flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-1`}
        >
          <FaEye className="text-sm" />
          {t('see_more')}
        </MyButton>
        <MyButton
          onClick={onDelete}
          className={`bg-red-400 hover:bg-red-500 text-white px-4 py-2 text-sm flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-1`}
        >
          <FaTrash className="text-sm" />
          {t('delete')}
        </MyButton>
      </div>
    </div>
  );
};

export default MenuCard;
