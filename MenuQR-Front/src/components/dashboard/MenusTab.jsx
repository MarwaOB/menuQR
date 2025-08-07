'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import MenuCard from '../UI/MenuCard';
import MyButton from '../UI/Button';
import Modal from '../UI/Modal';
import { FaTrash, FaExclamationTriangle } from 'react-icons/fa';

const dummyMenus = [
  { id: 1, number: 101, date: '2025-07-01', name: 'Summer Menu' },
  { id: 2, number: 102, date: '2025-07-15', name: 'BBQ Special' },
  { id: 3, number: 103, date: '2025-08-01', name: 'Breakfast Menu' },
];

const MenusTab = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [menus, setMenus] = useState(dummyMenus);
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove menu from state
      setMenus(prevMenus => prevMenus.filter(menu => menu.id !== menuToDelete.id));
      
      console.log('Menu deleted successfully:', menuToDelete.id);
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setMenuToDelete(null);
      
      // You can add a success notification here
      // toast.success(t('menu_deleted_successfully'));
      
    } catch (error) {
      console.error('Error deleting menu:', error);
      // You can add an error notification here
      // toast.error(t('error_deleting_menu'));
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
    } else if (selectedOption === 'scratch') {
      console.log('Add new empty menu');
      navigate('/menus/new');
    }
    setShowModal(false);
  };

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
              number={menu.number}
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
              menuName: menuToDelete?.name || `Menu ${menuToDelete?.number}`,
              menuNumber: menuToDelete?.number 
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