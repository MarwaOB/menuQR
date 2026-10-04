'use client';

import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ImageUp, X } from 'lucide-react';

const MAX_SIZE = 5 * 1024 * 1024; // matches the backend limit

const LogoUploader = ({ logoPreview, setLogoFile, setLogoPreview, disabled = false }) => {
  const { t } = useTranslation();

  const onDrop = (acceptedFiles, rejected) => {
    if (rejected?.length) {
      toast.error(t('file_too_large'));
      return;
    }
    const file = acceptedFiles[0];
    if (!file) return;
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
    maxSize: MAX_SIZE,
    disabled,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors duration-200 ${
          disabled
            ? 'cursor-not-allowed border-line bg-cream/50 opacity-60'
            : isDragActive
              ? 'cursor-pointer border-paprika bg-paprika-soft/50'
              : 'cursor-pointer border-ink/25 hover:border-paprika hover:bg-cream/60'
        }`}
      >
        <input {...getInputProps()} aria-label={t('upload_logo')} />
        <ImageUp size={22} strokeWidth={1.5} className="text-paprika" aria-hidden="true" />
        <p className="text-sm font-medium">{isDragActive ? t('drop_logo_here') : t('drag_or_click')}</p>
        <p className="text-xs text-muted">{t('dashboard.settings.brand_hint')}</p>
      </div>

      {logoPreview && (
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 rounded-2xl border border-line bg-paper p-2">
            <img src={logoPreview} alt={t('preview')} className="h-full w-full object-contain" />
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
              {t('remove_logo')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LogoUploader;
