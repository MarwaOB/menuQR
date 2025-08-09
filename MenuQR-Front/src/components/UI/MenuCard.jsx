'use client';

import React from 'react';
import MyButton from './Button';
import { FaTrash, FaEye } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const MenuCard = ({ name, date, onSeeMore, onDelete }) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition">
      <div>
        <p className="text-gray-700 font-semibold">
          {t('menu')} #{name}
        </p>
        <p className="text-sm text-gray-500">{t('created_on')}: {date}</p>
      </div>

      <div className="flex gap-2">
        <MyButton
          onClick={onSeeMore}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1 text-sm flex items-center gap-1"
        >
          <FaEye className="text-xs" />
          {t('see_more')}
        </MyButton>
        <MyButton
          onClick={onDelete}
          className="bg-red-400 hover:bg-red-500 text-white px-3 py-1 text-sm flex items-center gap-1"
        >
          <FaTrash className="text-xs" />
          {t('delete')}
        </MyButton>
      </div>
    </div>
  );
};

export default MenuCard;
