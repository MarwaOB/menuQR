'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import InputField from '../UI/InputField';
import MyButton from '../UI/Button';
import LogoUploader from '../UI/LogoUploader';

const SettingsTab = () => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    restaurantName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    description: '',
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form:', formData);
    console.log('Logo:', logoFile);
    // Submit data here (e.g. to your API)
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-red-500">{t('settings_title')}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label={t('restaurant_name')}
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                required
              />
              <InputField
                label={t('email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label={t('password')}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <InputField
                label={t('phone')}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <InputField
                label={t('address')}
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <LogoUploader
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
              setLogoFile={setLogoFile}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('description')}
          </label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          />
        </div>

        <MyButton type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-white">
          {t('update')}
        </MyButton>
      </form>
    </div>
  );
};

export default SettingsTab;