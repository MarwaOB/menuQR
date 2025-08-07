'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaChevronDown, FaImage, FaMagic } from 'react-icons/fa';
import MyButton from './Button';
import LogoUploader from './LogoUploader';
import SelectField from './SelectField';


const DISH_CATEGORIES = [
  'Drinks',
  'Starters',
  'Main Course',
  'Desserts',
  'Sides',
  'Sauces'
];

const DishInput = ({ onSubmit, onCancel, initialData = null }) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: DISH_CATEGORIES[0],
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || '',
        category: initialData.category || DISH_CATEGORIES[0],
      });
      if (initialData.image) {
        setImagePreview(initialData.image);
      }
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'price') {
      const numericValue = value.replace(/[^0-9.]/g, '');
      const decimalCount = (numericValue.match(/\./g) || []).length;
      if (decimalCount <= 1) {
        setFormData(prev => ({ ...prev, [name]: numericValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('dish_name_required');
    if (!formData.description.trim()) newErrors.description = t('description_required');
    if (!formData.price.trim()) {
      newErrors.price = t('price_required');
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = t('price_must_be_valid');
    }
    if (!formData.category) newErrors.category = t('category_required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const dishData = {
        ...formData,
        price: parseFloat(formData.price),
        image: imageFile || imagePreview,
      };
      await onSubmit(dishData);
    } catch (err) {
      console.error(err);
      alert(t('error_occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-yellow-50 via-white to-red-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-yellow-100 text-red-600 rounded-full font-medium mb-6 border border-yellow-300 shadow">
            <FaMagic className="text-red-500" />
            {initialData ? t('update_dish') : t('create_something_delicious')}
          </div>
          <h1 className="text-4xl font-bold text-red-600 mb-4">
            {initialData ? t('update_dish') : t('add_new_dish')}
          </h1>
       </div>

        {/* Form Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-yellow-100 shadow-lg">
          {/* Image Upload */}
          <div className="p-8 border-b border-yellow-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500 rounded-2xl">
                <FaImage className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-red-600">{t('dish_image')}</h3>
              </div>
            </div>
            <LogoUploader
              logoPreview={imagePreview}
              setLogoFile={setImageFile}
              setLogoPreview={setImagePreview}
            />
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Name & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-red-700 uppercase">{t('dish_name')} *</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={t('enter_dish_name')}
                  className={`w-full px-6 py-4 rounded-xl border ${
                    errors.name ? 'border-red-400' : 'border-gray-300'
                  } focus:ring-2 focus:ring-yellow-400 bg-white`}
                />
                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
              </div>

              <SelectField
                name="category"
                label={t('category')}
                value={formData.category}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('category')}
                onBlur={() => setFocusedField(null)}
                options={DISH_CATEGORIES.map(c => t(c.toLowerCase().replace(' ', '_')))}
                error={errors.category}
                />

            </div>

            {/* Price */}
            <div className="space-y-2 max-w-xs">
              <label className="text-sm font-semibold text-red-700 uppercase">{t('dish_price')} *</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 font-semibold">
                  DZD
                </div>
                <input
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className={`pl-16 pr-6 py-4 w-full rounded-xl border ${
                    errors.price ? 'border-red-400' : 'border-gray-300'
                  } focus:ring-2 focus:ring-yellow-400 bg-white`}
                  placeholder="0.00"
                />
              </div>
              {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-red-700 uppercase">{t('description')} *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-6 py-4 rounded-xl border ${
                  errors.description ? 'border-red-400' : 'border-gray-300'
                } focus:ring-2 focus:ring-yellow-400 bg-white`}
                placeholder={t('describe_your_dish')}
              />
              {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-yellow-100">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? t('saving') : (initialData ? t('update_dish') : t('add_dish'))}
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-4 px-8 rounded-xl transition-all duration-300"
                >
                  {t('cancel')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DishInput;
