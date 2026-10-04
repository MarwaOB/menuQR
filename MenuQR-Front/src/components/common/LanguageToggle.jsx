import { useTranslation } from 'react-i18next';

/** Switches between English and Arabic; <html dir> follows via utils/i18n. */
export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation();
  const isArabic = (i18n.resolvedLanguage || i18n.language || 'en').startsWith('ar');
  const next = isArabic ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      lang={next}
      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors duration-300 hover:bg-ink/5 ${className}`}
      aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      {isArabic ? 'EN' : 'ع'}
    </button>
  );
}
