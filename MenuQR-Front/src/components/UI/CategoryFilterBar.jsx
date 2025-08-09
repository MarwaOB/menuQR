'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

const CategoryFilterBar = ({ categories, selectedCategory, onChange }) => {
  const { t } = useTranslation();

  // Only add 'All' if it's not already in the categories array
  const allCategories = categories.includes('All') ? categories : ['All', ...categories];

  return (
    <div className="flex flex-wrap gap-3 items-center justify-start">
      {allCategories.map((cat) => {
        const isSelected = selectedCategory === cat;

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`
              relative px-5 py-2 text-sm font-semibold rounded-full backdrop-blur-md
              border transition-all duration-300 shadow-md
              ${
                isSelected
                  ? 'bg-yellow-300/80 text-black border-yellow-500 shadow-[inset_0_0_10px_rgba(255,215,0,0.3)]'
                  : 'bg-white/20 text-gray-700 hover:bg-yellow-100/50 hover:text-black'
              }
              hover:scale-105 active:scale-95
            `}
            style={{
              boxShadow: isSelected
                ? '0 4px 20px rgba(255, 204, 0, 0.4)'
                : '0 2px 8px rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            {t(cat.toLowerCase()) || cat}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilterBar;
