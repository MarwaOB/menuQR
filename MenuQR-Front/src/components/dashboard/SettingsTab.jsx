'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { restaurantAPI } from '../../utils/api';
import InputField from '../UI/InputField';
import MyButton from '../UI/Button';
import LogoUploader from '../UI/LogoUploader';

const SettingsTab = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    restaurant_id: null,
    restaurantName: '',
    email: '',
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

  try {
    // Upload logo if provided
    if(logoFile) {
      try {
        const logoData = await restaurantAPI.uploadLogo(logoFile, formData.restaurant_id);
        console.log('Logo uploaded:', logoData);
        setLogoPreview(logoData.cloudinary_url || null);
      } catch (logoError) {
        console.error('Failed to upload logo:', logoError);
        alert('Failed to upload logo');
        return;
      }
    }

    // Update profile
    const profileData = {
      restaurant_id: formData.restaurant_id,
      name: formData.restaurantName,
      email: formData.email,
      phone_number: formData.phone,
      address: formData.address,
      description: formData.description,
    };

    await restaurantAPI.updateProfile(profileData);
    alert('Profile updated successfully!');
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('Failed to update profile');
  }
};


  useEffect(() => {
    const fetchProfileAndLogo = async () => {
      try {
        const data = await restaurantAPI.getProfile();
        setFormData({
          restaurant_id: data.id || null,
          restaurantName: data.name || '',
          email: data.email || '',
          phone: data.phone_number || '',
          address: data.address || '',
          description: data.description || '',
        });
        
        if (data.id) {
          try {
            const logoData = await restaurantAPI.getLogo(data.id);
            setLogoPreview(logoData.image_url || null);
          } catch (logoError) {
            console.log('No logo found or error fetching logo:', logoError);
          }
        }
      } catch(error){
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndLogo();
  }, [])


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

        <MyButton type="submit" onClick={handleSubmit} className="bg-yellow-400 hover:bg-yellow-500 text-white">
          {t('update')}
        </MyButton>
      </form>
    </div>
  );
};

export default SettingsTab;