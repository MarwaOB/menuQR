'use client';

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';

import DishCard from '../components/UI/DishCard';
import MyButton from '../components/UI/Button';
import CategoryFilterBar from '../components/UI/CategoryFilterBar';

import { CATEGORIES } from '../constants/categories';


const MenuDetailsPage = () => {
    const dummyDishes = [
  {
    id: 1,
    image: '/images/dish1.jpg',
    name: 'Grilled Chicken',
    description: 'Juicy grilled chicken with herbs and spices.',
    price: '1200 DA',
    category: 'Main Course',
  },
  {
    id: 2,
    image: '/images/dish2.jpg',
    name: 'Pasta Alfredo',
    description: 'Creamy Alfredo pasta with parmesan.',
    price: '900 DA',
    category: 'Main Course',
  },
  {
    id: 3,
    image: '/images/dish3.jpg',
    name: 'Lemonade',
    description: 'Freshly squeezed lemonade with mint.',
    price: '300 DA',
    category: 'Drinks',
  },
];

  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredDishes =
    selectedCategory === 'All'
      ? dummyDishes
      : dummyDishes.filter((dish) => dish.category === selectedCategory);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back + Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-500 hover:text-yellow-600 text-xl transition-transform transform hover:scale-110"
          title={t('back')}
        >
          <FaArrowLeft />
        </button>

        <nav className="text-sm text-gray-500 flex items-center gap-1">
          <span
            className="hover:underline cursor-pointer"
            onClick={() => navigate('/menus')}
          >
            {t('menus')}
          </span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-700 font-medium">
            {t('menu')} #{id}
          </span>
        </nav>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-red-500">{t('dishes')}</h2>

      {/* Filters */}
      <CategoryFilterBar
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onChange={setSelectedCategory}
      />

      {/* Dishes */}
      <div className="space-y-4">
        {filteredDishes.length > 0 ? (
          filteredDishes.map((dish) => (
            <DishCard
              key={dish.id}
              image={dish.image}
              name={dish.name}
              description={dish.description}
              price={dish.price}
              showActions={false}
            />
          ))
        ) : (
          <p className="text-gray-400 italic text-sm">
            {t('no_dishes_found')}
          </p>
        )}
      </div>
    </div>
  );
};

export default MenuDetailsPage;
