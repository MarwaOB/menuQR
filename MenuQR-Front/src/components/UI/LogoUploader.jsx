'use client';

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { FaTimesCircle } from 'react-icons/fa';

const LogoUploader = ({ logoPreview, setLogoFile, setLogoPreview, disabled = false }) => {
  const { t } = useTranslation();

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert(t('file_too_large'));
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemove = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB limit to match backend
    disabled,
  });

  return (
    <div>
      {/*<label className="block text-sm font-medium text-gray-700 mb-2">
        {t('upload_logo')}
      </label>*/}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-4 transition ${
          disabled 
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
            : isDragActive 
              ? 'border-yellow-500 bg-yellow-50 cursor-pointer' 
              : 'border-gray-300 cursor-pointer hover:border-yellow-400'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-600 text-center">
          {isDragActive ? t('drop_logo_here') : t('drag_or_click')}
        </p>
      </div>

      {logoPreview && (
        <div className="mt-4 w-fit">
          <p className="text-sm text-gray-600 mb-1">{t('preview')}:</p>
          <div className="w-24 h-24">
            <img
              src={logoPreview}
              alt="Logo Preview"
              className="w-full h-full object-contain rounded-md shadow border"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LogoUploader;
