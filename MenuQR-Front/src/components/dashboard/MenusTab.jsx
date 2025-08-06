'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import MenuCard from '../UI/MenuCard';
import MyButton from '../UI/Button';
import Modal from '../UI/Modal';

const dummyMenus = [
  { id: 1, number: 101, date: '2025-07-01' },
  { id: 2, number: 102, date: '2025-07-15' },
  { id: 3, number: 103, date: '2025-08-01' },
];

const MenusTab = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');

  const handleSeeMore = (id) => {
    navigate(`/menus/${id}`);
  };

  const handleDelete = (id) => {
    console.log('Delete menu:', id);
  };

  const handleAddMenu = () => {
    if (selectedOption === 'existing') {
      console.log('Add from existing menu');
    } else if (selectedOption === 'scratch') {
      console.log('Add new empty menu');
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
        {dummyMenus.map((menu) => (
          <MenuCard
            key={menu.id}
            number={menu.number}
            date={menu.date}
            onSeeMore={() => handleSeeMore(menu.id)}
            onDelete={() => handleDelete(menu.id)}
          />
        ))}
      </div>

      {/* Modal */}
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
            onClick={() => setShowModal(false)}
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
    </div>
  );
};

export default MenusTab;
