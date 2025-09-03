'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { menuAPI, restaurantAPI } from '../../utils/api';
import MenuCard from '../UI/MenuCard';
import MyButton from '../UI/Button';
import Modal from '../UI/Modal';
import { FaTrash, FaExclamationTriangle, FaQrcode } from 'react-icons/fa';
import QRCodeModal from '../QRCodeModal';


const MenusTab = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  const [menus, setMenus] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [menuToDelete, setMenuToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleSeeMore = (id) => {
    navigate(`/menus/${id}`);
  };

  const handleDeleteClick = (id) => {
    const menu = menus.find(m => m.id === id);
    setMenuToDelete(menu);
    setShowDeleteModal(true);
  };

  const handleGenerateQR = () => {
    setShowQRModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!menuToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const result = await menuAPI.delete(menuToDelete.id);
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
        const allMenusData = await menuAPI.getAll(); 
        setMenus(allMenusData);
      } catch (error) {
        console.error('Error fetching all Menus:', error);
      } 
    };

    fetchAllMenus();
  }, []);



  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        <MyButton
          className={`bg-yellow-400 hover:bg-yellow-500 text-black flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2`}
          onClick={() => setShowModal(true)}
        >
          {t('add_menu')}
        </MyButton>
        <MyButton
          className={`bg-blue-500 hover:bg-blue-600 text-white flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2`}
          onClick={handleGenerateQR}
        >
          <FaQrcode className={isRTL ? 'ml-1' : 'mr-1'} />
          {t('generate_qr_code')}
        </MyButton>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        menuName={t('restaurant_menu')}
      />

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
          <div className={`text-center py-12 text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-lg mb-2">{t('no_menus_found')}</p>
            <p className="text-sm">{t('create_first_menu')}</p>
          </div>
        )}
      </div>

      {/* Add Menu Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h3 className={`text-lg font-bold mb-4 text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('choose_menu_type')}
        </h3>
        <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          <label className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
            <input
              type="radio"
              name="menuOption"
              value="existing"
              checked={selectedOption === 'existing'}
              onChange={(e) => setSelectedOption(e.target.value)}
              className={isRTL ? 'ml-2' : 'mr-2'}
            />
            {t('add_from_existing')}
          </label>
          <label className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
            <input
              type="radio"
              name="menuOption"
              value="scratch"
              checked={selectedOption === 'scratch'}
              onChange={(e) => setSelectedOption(e.target.value)}
              className={isRTL ? 'ml-2' : 'mr-2'}
            />
            {t('add_from_scratch')}
          </label>
        </div>

        <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-end gap-3 mt-6`}>
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
        <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={`flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4 ${isRTL ? 'ml-auto' : 'mr-auto'}`}>
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

          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-end gap-3`}>
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