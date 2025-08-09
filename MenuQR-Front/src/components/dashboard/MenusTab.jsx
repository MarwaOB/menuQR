'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import MenuCard from '../UI/MenuCard';
import MyButton from '../UI/Button';
import Modal from '../UI/Modal';
import { FaTrash, FaExclamationTriangle } from 'react-icons/fa';



const MenusTab = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [menus, setMenus] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [menuToDelete, setMenuToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSeeMore = (id) => {
    navigate(`/menus/${id}`);
  };

  const handleDeleteClick = (id) => {
    const menu = menus.find(m => m.id === id);
    setMenuToDelete(menu);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!menuToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/menu/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          menu_id: menuToDelete.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete menu');
      }

      const result = await response.json();
      console.log('Menu deleted successfully:', result);
      
      // Remove menu from state
      setMenus(prevMenus => prevMenus.filter(menu => menu.id !== menuToDelete.id));
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setMenuToDelete(null);
      
      // You can add a success notification here
      // toast.success(t('menu_deleted_successfully'));
      
    } catch (error) {
      console.error('Error deleting menu:', error);
      // You can add an error notification here
      // toast.error(t('error_deleting_menu'));
      alert(`Error: ${error.message}`); // Temporary error display
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setMenuToDelete(null);
  };

  const handleAddMenu = () => {
    if (selectedOption === 'existing') {
      console.log('Add from existing menu');
      navigate('/menus/newExisting');
    } else if (selectedOption === 'scratch') {
      console.log('Add new empty menu');
      navigate('/menus/newScratch');
    }
    setShowModal(false);
  };
  
  useEffect(() => {
        const fetchAllMenus = async () => {
          try { 
  const allMenusResponse = await fetch('http://localhost:3000/api/menu/allMenus');
  if(!allMenusResponse.ok) {
    console.error('Failed to fetch menus');
    return;}
  const allMenusData = await allMenusResponse.json(); 
  setMenus(allMenusData);
} catch (error) {
           console.error('Error fetching all Menus:', error);

} 
}


fetchAllMenus();
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <MyButton
          className="bg-yellow-400 hover:bg-yellow-500 text-black"
          onClick={() => setShowModal(true)}
        >
          {t('add_menu')}
        </MyButton>
      </div>

      <div className="space-y-4">
        {menus.length > 0 ? (
          menus.map((menu) => (
            <MenuCard
              key={menu.id}
              date={menu.date}
              name={menu.name}
              onSeeMore={() => handleSeeMore(menu.id)}
              onDelete={() => handleDeleteClick(menu.id)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">{t('no_menus_found')}</p>
            <p className="text-sm">{t('create_first_menu')}</p>
          </div>
        )}
      </div>

      {/* Add Menu Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h3 className="text-lg font-bold mb-4 text-gray-700">{t('choose_menu_type')}</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="menuOption"
              value="existing"
              checked={selectedOption === 'existing'}
              onChange={(e) => setSelectedOption(e.target.value)}
            />
            {t('add_from_existing')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="menuOption"
              value="scratch"
              checked={selectedOption === 'scratch'}
              onChange={(e) => setSelectedOption(e.target.value)}
            />
            {t('add_from_scratch')}
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <MyButton
            className="bg-gray-200 hover:bg-gray-300 text-gray-700"
            onClick={() => {
              setSelectedOption('');
              setShowModal(false);
            }}
          >
            {t('cancel')}
          </MyButton>
          <MyButton
            className="bg-yellow-400 hover:bg-yellow-500 text-black"
            onClick={handleAddMenu}
            disabled={!selectedOption}
          >
            {t('confirm')}
          </MyButton>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={handleCancelDelete}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <FaExclamationTriangle className="h-8 w-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('confirm_delete_menu')}
          </h3>
          
          <p className="text-sm text-gray-600 mb-6">
            {t('delete_menu_warning', { 
              menuName: menuToDelete?.name
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
    </div>
  );
};

export default MenusTab;