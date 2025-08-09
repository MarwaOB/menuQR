import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';

import DishCard from '../components/UI/DishCard';
import MyButton from '../components/UI/Button';
import CategoryFilterBar from '../components/UI/CategoryFilterBar';

const MenuDetailsPage = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [sections, setSections] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenuDetails = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/menu/${id}/full`);
        if (!res.ok) throw new Error('Failed to fetch menu details organised by sections');
        const data = await res.json();

        // Extract sections and flatten dishes from nested structure
        const sectionsData = data.sections || [];
        setSections(sectionsData);
        
        // Flatten dishes from all sections into a single array
        const allDishes = sectionsData.reduce((acc, section) => {
          if (section.dishes && section.dishes.length > 0) {
            // Add section_id to each dish for filtering
            const dishesWithSectionId = section.dishes.map(dish => ({
              ...dish,
              section_id: section.id
            }));
            return [...acc, ...dishesWithSectionId];
          }
          return acc;
        }, []);
        setDishes(allDishes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenuDetails();
  }, [id]);

  // Build categories for filter bar
  const categories = ['All', ...sections.map((section) => section.name)];

  // Filter dishes by selected section
  const filteredDishes =
    selectedCategory === 'All'
      ? dishes
      : dishes.filter(
          (dish) =>
            sections.find(
              (section) => section.id === dish.section_id && section.name === selectedCategory
            )
          );

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
        categories={categories}
        selectedCategory={selectedCategory}
        onChange={setSelectedCategory}
      />

      {/* Dishes */}
      <div className="space-y-4">
        {loading ? (
          <p>{t('loading')}</p>
        ) : filteredDishes.length > 0 ? (
          filteredDishes.map((dish) => (
            <DishCard
              key={dish.id}
              image={dish.images && dish.images.length > 0 ? dish.images[0] : null}
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