'use client';

import React, { useState } from 'react';
import MenuCard from '../components/UI/MenuCard';
import InputField from '../components/UI/InputField';
import DishCard from '../components/UI/DishCard';
import DishInput from '../components/UI/DishCardInput';
import MyButton from '../components/UI/Button';
import CategoryFilterBar from '../components/UI/CategoryFilterBar';
import Modal from '../components/UI/Modal'; 
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../constants/categories';
import QRCodeModal from '../components/QRCodeModal';
import { v4 as uuidv4 } from 'uuid';
import { FaPlus, FaTrash, FaExclamationTriangle } from 'react-icons/fa';

const mockMenus = [
  {
    id: 'menu1',
    number: 1,
    name: 'Summer Specials',
    date: '2025-08-07',
    dishes: [
      { id: 'd1', name: 'Grilled Chicken', description: 'With herbs', price: '1200 DA', image: '', category: 'Main Course' },
      { id: 'd2', name: 'Ice Cream', description: 'Vanilla flavor', price: '500 DA', image: '', category: 'Desserts' },
      { id: 'd3', name: 'Coca-Cola', description: 'Chilled drink', price: '300 DA', image: '', category: 'Drinks' },
    ],
  },
  {
    id: 'menu2',
    number: 2,
    name: 'Winter Warmers',
    date: '2025-06-12',
    dishes: [],
  },
];

const CreateFromExistingMenuPage = () => {
  const { t } = useTranslation();
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [newMenuName, setNewMenuName] = useState('');
  const [editableDishes, setEditableDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showQRModal, setShowQRModal] = useState(false);
  const [createdMenuData, setCreatedMenuData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [editingDishId, setEditingDishId] = useState(null);
  const [showAddDishForm, setShowAddDishForm] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dishToDelete, setDishToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelectMenu = (menuId) => {
    const selectedMenu = mockMenus.find((menu) => menu.id === menuId);
    setSelectedMenuId(menuId);
    setNewMenuName(`${selectedMenu.name} Copy`);
    setEditableDishes([...selectedMenu.dishes]);
    setSelectedCategory('All');
    setEditingDishId(null);
    setShowAddDishForm(false);
  };

  const handleUpdateDish = (dishId) => {
    setEditingDishId(dishId);
    setShowAddDishForm(false);
  };

  const handleEditDishSubmit = (dishData) => {
    setEditableDishes((prev) =>
      prev.map((dish) => (dish.id === editingDishId ? { ...dish, ...dishData } : dish))
    );
    setEditingDishId(null);
  };

  const handleAddDishSubmit = (dishData) => {
    const newDish = {
      id: uuidv4(),
      ...dishData,
      category: dishData.category || CATEGORIES[0],
    };
    setEditableDishes((prev) => [...prev, newDish]);
    setShowAddDishForm(false);
  };

  const handleDeleteDish = (dishId) => {
    const dish = editableDishes.find(d => d.id === dishId);
    setDishToDelete(dish);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!dishToDelete) return;
    
    setIsDeleting(true);
    try {
      // Simulate async deletion (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setEditableDishes((prev) => prev.filter((dish) => dish.id !== dishToDelete.id));
      setShowDeleteModal(false);
      setDishToDelete(null);
    } catch (error) {
      console.error('Error deleting dish:', error);
      alert(t('error_deleting_dish') || 'Error deleting dish');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDishToDelete(null);
    setIsDeleting(false);
  };

  const handleCancelEdit = () => setEditingDishId(null);
  const handleCancelAdd = () => setShowAddDishForm(false);

  const handleConfirm = async () => {
    if (!newMenuName.trim()) return alert(t('menu_name_required'));
    setIsLoading(true);

    try {
      const createdDate = new Date().toISOString().split('T')[0];
      const menuData = {
        id: uuidv4(),
        menuName: newMenuName,
        createdDate,
        dishes: editableDishes,
      };

      console.log('Menu Data:', menuData);
      await new Promise((res) => setTimeout(res, 1000));

      setCreatedMenuData(menuData);
      setShowQRModal(true);

      setNewMenuName('');
      setEditableDishes([]);
      setSelectedMenuId(null);
      setEditingDishId(null);
      setShowAddDishForm(false);
    } catch (err) {
      console.error(err);
      alert(t('error_creating_menu'));
    } finally {
      setIsLoading(false);
    }
  };

  const categorizedDishes = CATEGORIES.map((category) => ({
    category,
    dishes: editableDishes.filter((dish) => dish.category === category),
  }));

  const filteredDishes =
    selectedCategory === 'All'
      ? categorizedDishes
      : categorizedDishes.filter((c) => c.category === selectedCategory);

  // Get the dish being edited
  const editingDish = editingDishId ? editableDishes.find((dish) => dish.id === editingDishId) : null;

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <h2 className="text-2xl font-bold text-gray-800">{t('create_from_existing_menu')}</h2>

        {/* Menu List */}
        <div className="space-y-4">
          {mockMenus.map((menu) => (
            <div
              key={menu.id}
              className={`border-2 rounded-xl p-2 transition-all ${
                selectedMenuId === menu.id
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-transparent'
              }`}
            >
              <label className="flex items-center gap-4 cursor-pointer">
                <input
                  type="radio"
                  name="menu"
                  value={menu.id}
                  checked={selectedMenuId === menu.id}
                  onChange={() => handleSelectMenu(menu.id)}
                  className="w-5 h-5 accent-yellow-400"
                />
                <div className="w-full">
                  <MenuCard
                    number={menu.number}
                    date={menu.date}
                    onSeeMore={() => alert('View full menu')}
                    onDelete={() => alert('Cannot delete from here')}
                  />
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Rename & Edit */}
        {selectedMenuId && (
          <div className="space-y-6 border-t pt-6">
            <InputField
              label={t('new_menu_name')}
              name="newMenuName"
              value={newMenuName}
              onChange={(e) => setNewMenuName(e.target.value)}
              required
            />

            {/* Category Filter and Add Button */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-700">{t('edit_dishes')} ({editableDishes.length})</h3>
                {!showAddDishForm && !editingDishId && (
                  <MyButton
                    onClick={() => setShowAddDishForm(true)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2"
                  >
                    <FaPlus /> {t('add_dish')}
                  </MyButton>
                )}
              </div>
              
              <CategoryFilterBar
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onChange={setSelectedCategory}
              />

              {/* Add Dish Form */}
              {showAddDishForm && (
                <DishInput onSubmit={handleAddDishSubmit} onCancel={handleCancelAdd} />
              )}

              {/* Edit Dish Form */}
              {editingDish && (
                <DishInput 
                  onSubmit={handleEditDishSubmit} 
                  onCancel={handleCancelEdit} 
                  initialData={editingDish} 
                />
              )}

              {/* Dishes by Category */}
              {filteredDishes.map(({ category, dishes }) => (
                <div key={category} className="mt-4">
                  {dishes.length > 0 ? (
                    <div className="space-y-4 mt-2">
                      {dishes.map((dish) => (
                        <DishCard
                          key={dish.id}
                          id={dish.id}
                          image={dish.image || '/api/placeholder/200/200'}
                          name={dish.name}
                          description={dish.description}
                          price={dish.price}
                          onUpdate={() => handleUpdateDish(dish.id)}
                          onDelete={() => handleDeleteDish(dish.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">{t('no_dishes')}</p>
                  )}
                </div>
              ))}
            </div>

            {!showAddDishForm && !editingDishId && (
              <MyButton
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl mt-4"
                disabled={isLoading}
              >
                {isLoading ? t('creating_menu') : t('confirm')}
              </MyButton>
            )}
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

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={handleCancelDelete}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <FaExclamationTriangle className="h-8 w-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('confirm_delete_dish')}
          </h3>
          
          <p className="text-sm text-gray-600 mb-6">
            {t('delete_dish_warning', {
              dishName: dishToDelete?.name || `Dish ${dishToDelete?.id}`,
            })}
          </p>

          <div className="flex justify-center gap-3">
            <MyButton
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              {t('cancel')}
            </MyButton>
            
            <MyButton
              className="bg-red-500 hover:bg-red-600 text-white px-6 flex items-center gap-2"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {t('deleting')}
                </>
              ) : (
                <>
                  <FaTrash className="h-4 w-4" />
                  {t('delete')}
                </>
              )}
            </MyButton>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CreateFromExistingMenuPage;