'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Check } from 'lucide-react';
import { restaurantAPI } from '../../utils/api';
import InputField from '../UI/InputField';
import LogoUploader from '../UI/LogoUploader';
import PageHeader from './PageHeader';

/** Two-column settings row: heading + hint on the left, controls on the right. */
function Section({ title, hint, children }) {
  return (
    <section className="grid grid-cols-1 gap-5 border-b border-line py-8 first:pt-0 last:border-b-0 md:grid-cols-3 md:gap-10">
      <div>
        <h2 className="text-xl">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      <div className="md:col-span-2">{children}</div>
    </section>
  );
}

const SettingsTab = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState('');

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
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (logoFile) {
        setProgress(t('dashboard.settings.uploading_logo'));
        try {
          const logoData = await restaurantAPI.uploadLogo(logoFile, formData.restaurant_id);
          setLogoPreview(logoData.cloudinary_url || null);
          setLogoFile(null);
        } catch (logoError) {
          console.error('Failed to upload logo:', logoError);
          toast.error(t('dashboard.settings.logo_failed'));
          return;
        }
      }

      setProgress(t('dashboard.settings.saving'));
      await restaurantAPI.updateProfile({
        restaurant_id: formData.restaurant_id,
        name: formData.restaurantName,
        email: formData.email,
        phone_number: formData.phone,
        address: formData.address,
        description: formData.description,
      });
      toast.success(t('dashboard.settings.saved'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('dashboard.settings.save_failed'));
    } finally {
      setIsSubmitting(false);
      setProgress('');
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
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndLogo();
  }, []);

  return (
    <div>
      <PageHeader page="settings" />

      {loading ? (
        <div className="panel space-y-6 p-6 sm:p-8" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="skeleton h-5 w-32 rounded-full" />
              <div className="skeleton h-11 rounded-xl md:col-span-2" />
            </div>
          ))}
          <span className="sr-only" role="status">{t('common.loading')}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="panel">
          <div className="p-6 sm:p-8">
            <Section title={t('dashboard.settings.profile')} hint={t('dashboard.settings.profile_hint')}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label={t('restaurant_name')}
                  name="restaurantName"
                  value={formData.restaurantName}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  autoComplete="organization"
                />
                <InputField
                  label={t('email')}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                />
                <InputField
                  label={t('phone')}
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="tel"
                />
                <InputField
                  label={t('address')}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="street-address"
                />
              </div>
            </Section>

            <Section title={t('dashboard.settings.brand')} hint={t('upload_logo')}>
              <LogoUploader
                logoPreview={logoPreview}
                setLogoPreview={setLogoPreview}
                setLogoFile={setLogoFile}
                disabled={isSubmitting}
              />
            </Section>

            <Section title={t('dashboard.settings.about')} hint={t('dashboard.settings.about_hint')}>
              <label htmlFor="description" className="field-label">
                {t('description')}
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                className="field resize-y leading-relaxed"
                disabled={isSubmitting}
              />
            </Section>
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-4 rounded-b-[1.25rem] border-t border-line bg-paper/90 px-6 py-4 backdrop-blur sm:px-8">
            <span className="text-sm text-muted" role="status" aria-live="polite">
              {progress}
            </span>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper border-t-transparent" aria-hidden="true" />
              ) : (
                <Check size={16} strokeWidth={2} aria-hidden="true" />
              )}
              {t('update')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SettingsTab;
