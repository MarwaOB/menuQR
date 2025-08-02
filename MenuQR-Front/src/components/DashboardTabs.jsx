import React from 'react';
import MyButton from './UI/Button';
import { useTranslation } from 'react-i18next';

const TABS = [
  { key: 'menus', label: 'menus' },
  { key: 'orders', label: 'orders' },
  { key: 'analytics', label: 'analytics' },
  { key: 'settings', label: 'settings' },
];

const DashboardTabs = ({ activePath, onTabClick }) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-3">
      {TABS.map(({ key, label }) => (
        <MyButton
          key={key}
          onClick={() => onTabClick(`/${key}`)}
          className={`
            text-sm font-semibold px-4 py-2 rounded-xl
            ${activePath.includes(key)
              ? 'bg-yellow-400 text-white shadow'
              : 'bg-gray-100 hover:bg-yellow-200 text-black'}
          `}
        >
          {t(label)}
        </MyButton>
      ))}
    </div>
  );
};

export default DashboardTabs;
