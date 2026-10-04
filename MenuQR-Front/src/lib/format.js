/** Format a price coming from the API (DECIMAL serialised as a string). */
export function formatPrice(value, language = 'en') {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '';
  const locale = language === 'ar' ? 'ar-DZ' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatMenuDate(date, language = 'en') {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}
