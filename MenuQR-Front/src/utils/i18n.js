import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';


import en from '../translations/en.json';
import ar from '../translations/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
  });

// Keep <html dir/lang> in sync with the active language (also on first load).
const applyDirection = (lng) => {
  const lang = (lng || 'en').split('-')[0];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
};
applyDirection(i18n.resolvedLanguage || i18n.language);
i18n.on('languageChanged', applyDirection);

export default i18n;
