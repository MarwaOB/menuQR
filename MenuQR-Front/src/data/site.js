/**
 * Public brand & venue information for the marketing site.
 *
 * The restaurant profile (name, address, phone…) is only exposed by the API to
 * authenticated staff, so the public pages read it from here instead. Fill in
 * the real details — anything left empty/null is simply not rendered, so the
 * site never shows placeholder or invented information.
 */
const site = {
  // Wordmark shown in the navigation, loader and footer.
  name: import.meta.env.VITE_RESTAURANT_NAME || 'MenuQR',

  // Optional: exact name of the dish to feature as the "Signature".
  // When empty, the first dish of today's menu (preferring one with a photo)
  // is featured and labelled "Featured today" rather than "Signature".
  signatureDishName: '',

  contact: {
    address: '', // e.g. '12 Rue Didouche Mourad, Algiers'
    phone: '', // e.g. '+213 555 00 00 00'
    email: '',
    mapUrl: '', // e.g. a Google Maps link
  },

  // e.g. [{ days: 'Mon – Fri', time: '11:00 – 23:00' }]
  hours: [],

  // e.g. { instagram: 'https://instagram.com/…', facebook: '…' }
  social: {},

  /**
   * Atmosphere gallery. Add real photos of the restaurant (interior, kitchen,
   * team, details). Put optimised files in /public/images and reference them:
   * { src: '/images/interior.webp', alt: 'Dining room at dusk', caption: 'The room' }
   * When empty, dish photos from today's menu are used if there are enough.
   */
  gallery: [],

  /**
   * Guest reviews — only add genuine reviews you have permission to publish.
   * { name: 'Amina B.', rating: 5, text: '…', avatar: '/images/amina.webp', source: 'Google' }
   * The reviews section is hidden while this list is empty.
   */
  reviews: [],
};

export default site;
