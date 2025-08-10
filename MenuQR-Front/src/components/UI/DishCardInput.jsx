import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../../constants/categories';
import { FaUpload, FaTrash, FaImage } from 'react-icons/fa';

const DishCardInput = ({ onSubmit, onCancel, initialData = null, sections = [] }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: CATEGORIES[0],
    section_id: sections.length > 0 ? sections[0].id : null,
    image: null, // File object
    imagePreview: null // URL for preview
  });

  // Set initial data only once when component mounts or initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || '',
        category: initialData.category || CATEGORIES[0],
        section_id: initialData.section_id || (sections.length > 0 ? sections[0].id : null),
        image: initialData.image || null,
        imagePreview: initialData.imagePreview || initialData.image || null
      });
    } else {
      // Reset form for new dish
      setFormData({
        name: '',
        description: '',
        price: '',
        category: CATEGORIES[0],
        section_id: sections.length > 0 ? sections[0].id : null,
        image: null,
        imagePreview: null
      });
    }
  }, [initialData?.id, sections]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSectionChange = (e) => {
    const sectionId = parseInt(e.target.value);
    const selectedSection = sections.find(s => s.id === sectionId);
    
    setFormData(prev => ({
      ...prev,
      section_id: sectionId,
      category: selectedSection?.name || CATEGORIES[0]
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(t('invalid_image_type') || 'Please select a valid image file');
        return;
      }

      // Validate file size (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert(t('image_too_large') || 'Image size must be less than 5MB');
        return;
      }

      // Clean up previous blob URL if it exists
      if (formData.imagePreview && formData.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(formData.imagePreview);
      }

      // Create new blob URL for preview
      const imagePreview = URL.createObjectURL(file);
      
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: imagePreview
      }));
    }
  };

  const handleRemoveImage = () => {
    // Clean up blob URL
    if (formData.imagePreview && formData.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: null
    }));

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      alert(t('dish_name_required') || 'Dish name is required');
      return;
    }
    
    if (!formData.price.trim()) {
      alert(t('dish_price_required') || 'Dish price is required');
      return;
    }

    if (!formData.section_id) {
      alert(t('section_required') || 'Please select a section');
      return;
    }

    // Submit the form data
    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: formData.price.trim(),
      category: formData.category,
      section_id: formData.section_id,
      image: formData.image,
      imagePreview: formData.imagePreview
    };

    onSubmit(submitData);
    
    // Reset form only if not editing (no initialData)
    if (!initialData) {
      // Clean up blob URL
      if (formData.imagePreview && formData.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(formData.imagePreview);
      }
      
      setFormData({
        name: '',
        description: '',
        price: '',
        category: CATEGORIES[0],
        section_id: sections.length > 0 ? sections[0].id : null,
        image: null,
        imagePreview: null
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = () => {
    // Clean up any blob URLs created during editing
    if (formData.imagePreview && formData.imagePreview.startsWith('blob:') && 
        (!initialData || formData.imagePreview !== initialData.imagePreview)) {
      URL.revokeObjectURL(formData.imagePreview);
    }

    // Reset to initial data if editing, or clear if adding new
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || '',
        category: initialData.category || CATEGORIES[0],
        section_id: initialData.section_id || (sections.length > 0 ? sections[0].id : null),
        image: initialData.image || null,
        imagePreview: initialData.imagePreview || initialData.image || null
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        category: CATEGORIES[0],
        section_id: sections.length > 0 ? sections[0].id : null,
        image: null,
        imagePreview: null
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onCancel();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (formData.imagePreview && formData.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(formData.imagePreview);
      }
    };
  }, []);

  return (
    <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
      <h4 className="text-lg font-semibold text-gray-700 mb-4">
        {initialData ? t('edit_dish') : t('add_new_dish')}
      </h4>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dish Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dish_name')} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder={t('enter_dish_name')}
              required
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('price')} *
            </label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="1200 DA"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('description')}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
            placeholder={t('enter_dish_description')}
          />
        </div>

        {/* Section Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('section')} *
          </label>
          <select
            name="section_id"
            value={formData.section_id || ''}
            onChange={handleSectionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            required
          >
            <option value="" disabled>
              {t('select_section')}
            </option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('dish_image')} ({t('optional')})
          </label>
          
          <div className="space-y-3">
            {/* Image Preview */}
            {formData.imagePreview && (
              <div className="relative inline-block">
                <img
                  src={formData.imagePreview}
                  alt="Dish preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                />
                
              </div>
            )}

            {/* Upload Button */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="dish-image-upload"
              />
              <label
                htmlFor="dish-image-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                {formData.imagePreview ? <FaImage /> : <FaUpload />}
                {formData.imagePreview ? t('change_image') : t('upload_image')}
              </label>
              
              <span className="text-sm text-gray-500">
                {t('max_size_5mb')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            {t('cancel')}
          </button>
          
          <button
            type="submit"
            className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg transition-colors font-medium"
          >
            {initialData ? t('update_dish') : t('add_dish')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DishCardInput;