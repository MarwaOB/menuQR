'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DishCard from '../components/UI/DishCard';
import DishInput from '../components/UI/DishCardInput';
import MyButton from '../components/UI/Button';
import QRCodeModal from '../components/QRCodeModal';
import { v4 as uuidv4 } from 'uuid';
import { FaPlus, FaCheck } from 'react-icons/fa';
import { CATEGORIES } from '../constants/categories';
import { UtensilsCrossed } from 'lucide-react';

const AddNewMenuPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [menuName, setMenuName] = useState('');
  const [dishes, setDishes] = useState([]);
  const [showAddDishForm, setShowAddDishForm] = useState(false);
  const [editingDishId, setEditingDishId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [createdMenuData, setCreatedMenuData] = useState(null);

  const handleAddDishSubmit = (dishData) => {
    const newDish = {
      id: uuidv4(),
      ...dishData,
      category: dishData.category || CATEGORIES[0],
    };
    setDishes((prev) => [...prev, newDish]);
    setShowAddDishForm(false);
  };

  const handleEditDishSubmit = (dishData) => {
    setDishes((prev) =>
      prev.map((dish) => (dish.id === editingDishId ? { ...dish, ...dishData } : dish))
    );
    setEditingDishId(null);
  };

  const handleRemoveDish = (id) => {
    setDishes((prev) => prev.filter((dish) => dish.id !== id));
  };

  const handleEditDish = (id) => {
    setEditingDishId(id);
    setShowAddDishForm(false);
  };

  const handleCancelEdit = () => setEditingDishId(null);
  const handleCancelAdd = () => setShowAddDishForm(false);

  const handleConfirm = async () => {
    if (!menuName.trim()) return alert(t('menu_name_required'));
    if (dishes.length === 0) return alert(t('at_least_one_dish'));
    setIsLoading(true);

    try {
      const createdDate = new Date().toISOString().split('T')[0];
      const menuData = { 
        id: uuidv4(), // Generate unique ID for the menu
        menuName, 
        createdDate, 
        dishes 
      };
      
      console.log('Menu Data:', menuData);
      await new Promise((res) => setTimeout(res, 1000));
      
      // Store the created menu data and show QR modal
      setCreatedMenuData(menuData);
      setShowQRModal(true);
      
      // Reset form after showing QR
      setMenuName('');
      setDishes([]);
    } catch (err) {
      console.error(err);
      alert(t('error_creating_menu'));
    } finally {
      setIsLoading(false);
    }
  };

  const editingDish = editingDishId ? dishes.find((dish) => dish.id === editingDishId) : null;

  return (
    <>
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        <div className={`space-y-2 text-${isRTL ? 'right' : 'left'}`}>
          <h2 className="text-4xl font-bold text-red-500">{t('add_menu')}</h2>
          <p className="text-gray-600">{t('create_menu_description')}</p>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200 shadow-lg bg-white/40 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('menu_details')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('menu_name')} *</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder={t('menu_name_placeholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('created_on')}
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-600">
                  {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-semibold text-gray-800">{t('menu_dishes')} ({dishes.length})</h3>
            {!showAddDishForm && !editingDishId && (
              <MyButton
                onClick={() => setShowAddDishForm(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl flex items-center gap-2"
              >
                <FaPlus /> {t('add_dish')}
              </MyButton>
            )}
          </div>

          {showAddDishForm && <DishInput onSubmit={handleAddDishSubmit} onCancel={handleCancelAdd} />}
          {editingDish && <DishInput onSubmit={handleEditDishSubmit} onCancel={handleCancelEdit} initialData={editingDish} />}

          {dishes.length > 0 ? (
            <div className="space-y-4">
              {dishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  id={dish.id} 
                  image={dish.image || '/api/placeholder/200/200'}
                  name={dish.name}
                  description={dish.description}
                  price={dish.price}
                  onUpdate={handleEditDish} 
                  onDelete={handleRemoveDish} 
                  />
              ))}
            </div>
          ) : (
            !showAddDishForm && !editingDishId && (
              <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed border-gray-300 bg-gray-50/50 rounded-2xl">
                <div className="text-gray-400 mb-4">
                  <UtensilsCrossed size={64} strokeWidth={1.5} />
                </div>
                <h4 className="text-lg font-medium text-gray-600 mb-2">{t('no_dishes_yet')}</h4>
                <p className="text-gray-500 mb-4">{t('add_first_dish')}</p>
              </div>
            )
          )}
        </div>

        {dishes.length > 0 && !showAddDishForm && !editingDishId && (
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <MyButton
              onClick={handleConfirm}
              disabled={isLoading || !menuName.trim()}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-4 px-8 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                  {t('creating_menu')}
                </>
              ) : (
                <>
                  <FaCheck /> {t('confirm_menu')}
                </>
              )}
            </MyButton>
          </div>
        )}

        {dishes.length > 0 && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">{t('menu_summary')}</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>{t('menu_name')}:</strong> {menuName || t('not_set')}</p>
              <p><strong>{t('total_dishes')}:</strong> {dishes.length}</p>
              <p><strong>{t('creation_date')}:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        menuName={createdMenuData?.menuName || ''}
        menuData={createdMenuData}
      />
    </>
  );
};

export default AddNewMenuPage;