'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuCard from '../components/UI/MenuCard';
import { useTranslation } from 'react-i18next';
import { sectionAPI, menuAPI, dishAPI } from '../utils/api';
import { toast } from 'react-toastify';
import DishCard from '../components/UI/DishCard';
import DishInput from '../components/UI/DishCardInput';
import MyButton from '../components/UI/Button';

import { v4 as uuidv4 } from 'uuid';
import { FaPlus, FaCheck, FaSpinner, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { UtensilsCrossed, Copy } from 'lucide-react';
import InputField from '../components/UI/InputField';
import CategoryFilterBar from '../components/UI/CategoryFilterBar';
import { CATEGORIES } from '../constants/categories';
import Modal from '../components/UI/Modal';
import config from '../config';

const API_BASE_URL = config.API_BASE_URL;

const CreateFromExistingMenuPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [selectedMenuData, setSelectedMenuData] = useState(null);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuDate, setNewMenuDate] = useState('');
  const [editableDishes, setEditableDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [isLoading, setIsLoading] = useState(false);
  
  const [editingDishId, setEditingDishId] = useState(null);
  const [showAddDishForm, setShowAddDishForm] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dishToDelete, setDishToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all menus and sections on component mount
  useEffect(() => {
    fetchMenus();
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const sectionsData = await sectionAPI.getAll();
      setSections(sectionsData);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchMenus = async () => {
    try {
      setLoadingMenus(true);
      const menusData = await menuAPI.getAll();
      setMenus(menusData);
    } catch (error) {
      console.error('Error fetching menus:', error);
      alert(t('error_fetching_menus') || 'Error fetching menus');
    } finally {
      setLoadingMenus(false);
    }
  };

  const fetchFullMenu = async (menuId) => {
    try {
      const menuData = await menuAPI.getFull(menuId);
      return menuData;
    } catch (error) {
      console.error('Error fetching menu details:', error);
      throw error;
    }
  };

  const handleSelectMenu = async (menuId) => {
    try {
      setIsLoading(true);
      const menuData = await fetchFullMenu(menuId);
      
      setSelectedMenuId(menuId);
      setSelectedMenuData(menuData);
      setNewMenuName(`${menuData.name} - Copy`);
      
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0];
      setNewMenuDate(today);
      
      // Convert sections/dishes to the format expected by the frontend
      const dishes = [];
      menuData.sections?.forEach(section => {
        section.dishes?.forEach(dish => {
          dishes.push({
            id: dish.id,
            name: dish.name,
            description: dish.description,
            price: dish.price,
            image: dish.images?.[0] || null, // Use first image URL if available
            imagePreview: dish.images?.[0] || null, // For display
            category: section.name, // Map section name to category
            section_id: section.id // Store section_id for backend
          });
        });
      });
      
      setEditableDishes(dishes);
      setSelectedCategory('All');
      setEditingDishId(null);
      setShowAddDishForm(false);
    } catch (error) {
      alert(t('error_loading_menu') || 'Error loading menu details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDish = (dishId) => {
    setEditingDishId(dishId);
    setShowAddDishForm(false);
  };

  const handleEditDishSubmit = (dishData) => {
    // Handle image preview for new uploads
    let imagePreview = null;
    if (dishData.image instanceof File) {
      imagePreview = URL.createObjectURL(dishData.image);
    } else if (typeof dishData.image === 'string') {
      imagePreview = dishData.image;
    } else {
      // Keep existing preview if no new image
      const existingDish = editableDishes.find(dish => dish.id === editingDishId);
      imagePreview = existingDish?.imagePreview;
    }

    setEditableDishes((prev) =>
      prev.map((dish) => (dish.id === editingDishId ? { 
        ...dish, 
        ...dishData,
        imagePreview: imagePreview
      } : dish))
    );
    setEditingDishId(null);
  };

  const handleAddDishSubmit = (dishData) => {
    // Handle image preview for new uploads
    let imagePreview = null;
    if (dishData.image instanceof File) {
      imagePreview = URL.createObjectURL(dishData.image);
    } else if (typeof dishData.image === 'string') {
      imagePreview = dishData.image;
    }

    const newDish = {
      id: uuidv4(),
      ...dishData,
      imagePreview: imagePreview,
      isNew: true // Mark as new for backend processing
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
      // Just remove from local state, will be handled in final creation
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
    if (!newMenuName.trim()) {
      alert(t('menu_name_required') || 'Menu name is required');
      return;
    }
    
    if (!newMenuDate) {
      alert(t('menu_date_required') || 'Menu date is required');
      return;
    }

    setIsLoading(true);

    try {
      // Create new menu with modified dishes (similar to AddNewMenuPage approach)
      const createdDate = newMenuDate;
      
      // Step 1: Create the menu
      const menuResult = await menuAPI.create({
        name: newMenuName,
        date: createdDate
      });
      const menuId = menuResult.menu_id;

      // Step 2: Add all dishes to the menu with images
      const dishPromises = editableDishes.map(async (dish) => {
        // First, create the dish
        const dishResult = await dishAPI.create({
          name: dish.name,
          description: dish.description,
          price: dish.price,
          section_id: dish.section_id,
          menu_id: menuId
        });
        const dishId = dishResult.dish_id;

        // Then, upload the image if it exists and is a File
        if (dish.image && dish.image instanceof File) {
          try {
            await dishAPI.uploadImage(dishId, dish.image);
          } catch (imageError) {
            console.warn(`Failed to upload image for dish "${dish.name}":`, imageError);
            // Don't throw error for image upload failure
          }
        }

        return dishResult;
      });

      // Wait for all dishes to be created
      await Promise.all(dishPromises);

      // Clean up object URLs
      editableDishes.forEach(dish => {
        if (dish.imagePreview && dish.imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(dish.imagePreview);
        }
      });

      // Show success message and navigate to dashboard
      toast.success(t('menu_created_successfully'));
      navigate('/dashboard');

    } catch (error) {
      console.error('Error creating menu:', error);
      alert(t('error_creating_menu') || `Error creating menu: ${error.message}`);
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

  if (loadingMenus) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-4xl text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <h2 className="text-2xl font-bold text-gray-800">{t('create_from_existing_menu')}</h2>

        {/* Menu List */}
        <div className="space-y-4">
          {menus.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {t('no_menus_available') || 'No menus available'}
            </p>
          ) : (
            menus.map((menu) => (
              <div
                key={menu.id}
                className={`border-2 rounded-xl p-2 transition-all ${
                  selectedMenuId === menu.id
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-transparent hover:border-gray-200'
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
                    disabled={isLoading}
                  />
                  <div className="w-full">
                    <MenuCard
                      number={menu.id}
                      name={menu.name}
                      date={new Date(menu.date).toLocaleDateString()}
                      onSeeMore={() => handleSelectMenu(menu.id)}
                      onDelete={() => {}} // Disable delete from here
                    />
                  </div>
                </label>
              </div>
            ))
          )}
        </div>

        {/* Rename, Set Date & Edit */}
        {selectedMenuId && selectedMenuData && (
          <div className="space-y-6 border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label={t('new_menu_name')}
                name="newMenuName"
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                required
              />
              
              <InputField
                label={t('menu_date')}
                name="newMenuDate"
                type="date"
                value={newMenuDate}
                onChange={(e) => setNewMenuDate(e.target.value)}
                required
              />
            </div>

            {/* Category Filter and Add Button */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-700">
                  {t('edit_dishes')} ({editableDishes.length})
                </h3>
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
                <DishInput 
                  onSubmit={handleAddDishSubmit} 
                  onCancel={handleCancelAdd} 
                  sections={sections}
                />
              )}

              {/* Edit Dish Form */}
              {editingDish && (
                <DishInput 
                  onSubmit={handleEditDishSubmit} 
                  onCancel={handleCancelEdit} 
                  initialData={editingDish}
                  sections={sections}
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
                          image={dish.imagePreview || dish.image || '/api/placeholder/200/200'}
                          name={dish.name}
                          description={dish.description}
                          price={dish.price}
                          onUpdate={() => handleUpdateDish(dish.id)}
                          onDelete={() => handleDeleteDish(dish.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    selectedCategory !== 'All' && (
                      <p className="text-gray-400 italic">{t('no_dishes_in_category')}</p>
                    )
                  )}
                </div>
              ))}
            </div>

            {!showAddDishForm && !editingDishId && (
              <MyButton
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl mt-4 flex items-center gap-2"
                disabled={isLoading || !newMenuName.trim() || !newMenuDate}
              >
                {isLoading && <FaSpinner className="animate-spin" />}
                {isLoading ? t('creating_menu') : t('confirm')}
              </MyButton>
            )}
          </div>
        )}
      </div>

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
              dishName: dishToDelete?.name || 'this dish',
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