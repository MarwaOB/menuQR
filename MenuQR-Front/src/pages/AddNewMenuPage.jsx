import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { sectionAPI, menuAPI, dishAPI } from '../utils/api';
import DishCard from '../components/UI/DishCard';
import DishInput from '../components/UI/DishCardInput';
import MyButton from '../components/UI/Button';

import { v4 as uuidv4 } from 'uuid';
import { FaPlus, FaCheck } from 'react-icons/fa';
import { UtensilsCrossed } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AddNewMenuPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [menuName, setMenuName] = useState('');
  const [dishes, setDishes] = useState([]);
  const [sections, setSections] = useState([]);
  const [showAddDishForm, setShowAddDishForm] = useState(false);
  const [editingDishId, setEditingDishId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();


  // Fetch sections on component mount
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const sectionsData = await sectionAPI.getAll();
        setSections(sectionsData);
      } catch (error) {
        console.error('Error fetching sections:', error);
      }
    };

    fetchSections();
  }, []);

  const handleAddDishSubmit = (dishData) => {
    console.log('Adding dish with data:', dishData);
    
    // Create image preview URL if image is a File
    let imagePreview = null;
    if (dishData.image instanceof File) {
      imagePreview = URL.createObjectURL(dishData.image);
    } else if (typeof dishData.image === 'string') {
      imagePreview = dishData.image;
    }
    
    const newDish = {
      id: uuidv4(),
      name: dishData.name,
      description: dishData.description,
      price: dishData.price,
      section_id: dishData.section_id || (sections.length > 0 ? sections[0].id : null),
      image: dishData.image, // Keep original File object for upload
      imagePreview: imagePreview // URL for display
    };
    
    console.log('New dish object:', newDish);
    setDishes((prev) => [...prev, newDish]);
    setShowAddDishForm(false);
  };

  const handleEditDishSubmit = (dishData) => {
    // Don't revoke blob URLs here - let the editing process handle them
    
    // Create image preview URL if image is a File
    let imagePreview = null;
    if (dishData.image instanceof File) {
      imagePreview = URL.createObjectURL(dishData.image);
    } else if (typeof dishData.image === 'string') {
      imagePreview = dishData.image;
    } else {
      // If no new image provided, keep the existing preview
      const existingDish = dishes.find(dish => dish.id === editingDishId);
      imagePreview = existingDish?.imagePreview;
    }

    setDishes((prev) =>
      prev.map((dish) => (dish.id === editingDishId ? { 
        ...dish, 
        ...dishData,
        image: dishData.image || dish.image, // Keep existing image if no new one
        imagePreview: imagePreview
      } : dish))
    );
    setEditingDishId(null);
  };

  const handleRemoveDish = (id) => {
    // Clean up object URLs to prevent memory leaks
    const dishToRemove = dishes.find(dish => dish.id === id);
    if (dishToRemove && dishToRemove.imagePreview && dishToRemove.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(dishToRemove.imagePreview);
    }
    setDishes((prev) => prev.filter((dish) => dish.id !== id));
  };

  const handleEditDish = (id) => {
    // Always create a fresh blob URL for the dish being edited if it has a File
    const dishToEdit = dishes.find(dish => dish.id === id);
    if (dishToEdit && dishToEdit.image instanceof File) {
      // Revoke the old blob URL if it exists
      if (dishToEdit.imagePreview && dishToEdit.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(dishToEdit.imagePreview);
      }
      
      // Create a fresh blob URL
      const freshBlobUrl = URL.createObjectURL(dishToEdit.image);
      setDishes((prev) =>
        prev.map((dish) => (dish.id === id ? { 
          ...dish, 
          imagePreview: freshBlobUrl
        } : dish))
      );
    }
    
    setEditingDishId(id);
    setShowAddDishForm(false);
  };

  const handleCancelEdit = () => {
    // Don't revoke blob URL when canceling edit, just close the form
    setEditingDishId(null);
  };
  const handleCancelAdd = () => setShowAddDishForm(false);

  const handleConfirm = async () => {
    if (!menuName.trim()) return alert(t('menu_name_required'));
    if (dishes.length === 0) return alert(t('at_least_one_dish'));
    setIsLoading(true);

    try {
      const createdDate = new Date().toISOString().split('T')[0];
      
      // Step 1: Create the menu
      const menuResult = await menuAPI.create({
        name: menuName,
        date: createdDate
      });
      const menuId = menuResult.menu_id;
      console.log('Menu created with ID:', menuId);

      // Step 2: Add all dishes to the menu with images
      const dishPromises = dishes.map(async (dish) => {
        console.log(`Processing dish: ${dish.name}`);
        console.log(`Image type: ${dish.image ? dish.image.constructor.name : 'none'}`);
        
        // First, create the dish
        const dishResult = await dishAPI.create({
          name: dish.name,
          description: dish.description,
          price: dish.price,
          section_id: dish.section_id,
          menu_id: menuId
        });
        const dishId = dishResult.dish_id;
        console.log(`Dish created with ID: ${dishId}`);

        // Then, upload the image if it exists and is a File
        if (dish.image && dish.image instanceof File) {
          console.log(`Uploading image for dish: ${dish.name}`);
          
          try {
            const imageResult = await dishAPI.uploadImage(dishId, dish.image);
            console.log(`Image uploaded successfully for dish "${dish.name}":`, imageResult);
          } catch (imageError) {
            console.warn(`Failed to upload image for dish "${dish.name}":`, imageError);
            // Don't throw error for image upload failure, just log it
          }
        } else {
          console.log(`No image to upload for dish: ${dish.name}`);
        }

        return dishResult;
      });

      // Wait for all dishes to be created
      await Promise.all(dishPromises);
      console.log('All dishes created successfully with images');

      // Clean up object URLs
      dishes.forEach(dish => {
        if (dish.imagePreview && dish.imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(dish.imagePreview);
        }
      });

      // Show success message and navigate to menus page
      toast.success(t('menu_created_successfully'));
      navigate('/dashboard');
    } catch (err) {
      console.error('Error creating menu:', err);
      alert(`${t('error_creating_menu')}: ${err.message}`);
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

          {showAddDishForm && <DishInput onSubmit={handleAddDishSubmit} onCancel={handleCancelAdd} sections={sections} />}
          {editingDish && <DishInput onSubmit={handleEditDishSubmit} onCancel={handleCancelEdit} initialData={editingDish} sections={sections} />}

          {dishes.length > 0 ? (
            <div className="space-y-4">
              {dishes.map((dish) => {
                console.log('Rendering dish:', dish.name, 'with imagePreview:', dish.imagePreview);
                return (
                  <DishCard
                    key={dish.id}
                    id={dish.id} 
                    // Use imagePreview for display, fallback to placeholder
                    image={dish.imagePreview || '/api/placeholder/200/200'}
                    name={dish.name}
                    description={dish.description}
                    price={dish.price}
                    onUpdate={handleEditDish} 
                    onDelete={handleRemoveDish} 
                  />
                );
              })}
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

    </>
  );
};

export default AddNewMenuPage;