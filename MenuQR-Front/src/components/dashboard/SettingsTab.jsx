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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });

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
  
  // Clear status message after 5 seconds
  useEffect(() => {
    if (submitStatus.type) {
      const timer = setTimeout(() => {
        setSubmitStatus({ type: null, message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus({ type: null, message: '' });
    setIsSubmitting(true);

    try {
      // Upload logo if provided
      if (logoFile) {
        try {
          setSubmitStatus({ type: 'info', message: 'Uploading logo...' });
          const logoData = await restaurantAPI.uploadLogo(logoFile, formData.restaurant_id);
          setLogoPreview(logoData.cloudinary_url || null);
        } catch (logoError) {
          console.error('Failed to upload logo:', logoError);
          setSubmitStatus({ 
            type: 'error', 
            message: 'Failed to upload logo. Please try again.' 
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Update profile
      setSubmitStatus({ type: 'info', message: 'Updating profile...' });
      const profileData = {
        restaurant_id: formData.restaurant_id,
        name: formData.restaurantName,
        email: formData.email,
        phone_number: formData.phone,
        address: formData.address,
        description: formData.description,
      };

      await restaurantAPI.updateProfile(profileData);
      
      setSubmitStatus({ 
        type: 'success', 
        message: 'Profile updated successfully!' 
      });
      
      // Clear the logo file from state after successful upload
      setLogoFile(null);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: 'Failed to update profile. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
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


  // Status message component
  const StatusMessage = ({ status }) => {
    if (!status.type) return null;
    
    const statusStyles = {
      info: 'bg-blue-50 text-blue-800 border-blue-200',
      success: 'bg-green-50 text-green-800 border-green-200',
      error: 'bg-red-50 text-red-800 border-red-200',
    };
    
    return (
      <div className={`mb-6 p-4 rounded-lg border ${statusStyles[status.type]}`}>
        <div className="flex items-center">
          {status.type === 'info' && (
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h.01a1 1 0 100-2H10V9z" clipRule="evenodd" />
            </svg>
          )}
          {status.type === 'success' && (
            <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {status.type === 'error' && (
            <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span>{status.message}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-red-500">{t('settings_title')}</h2>
      
      {/* Status Message */}
      {submitStatus.type && <StatusMessage status={submitStatus} />}
      
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
                disabled={isSubmitting}
              />
              <InputField
                label={t('email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label={t('phone')}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <InputField
                label={t('address')}
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <LogoUploader
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
              setLogoFile={setLogoFile}
              disabled={isSubmitting}
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
            disabled={isSubmitting}
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