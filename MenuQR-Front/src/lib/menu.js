// Helpers for working with the menu payload returned by `/menu/current` and
// `/menu/:id/full` ({ id, name, date, sections: [{ id, name, dishes: [...] }] }).

/** Flatten sections into a single dish list, tagging each dish with its section. */
export function flattenDishes(sections = []) {
  return sections.flatMap((section) =>
    (section.dishes || []).map((dish) => ({
      ...dish,
      section_id: section.id,
      section_name: section.name,
    }))
  );
}

export function dishImage(dish) {
  return dish?.images && dish.images.length > 0 ? dish.images[0] : null;
}

/** Pick dishes to feature on the home page: photos first, then menu order. */
export function pickFeatured(dishes, count = 5) {
  const withImage = dishes.filter((d) => dishImage(d));
  const withoutImage = dishes.filter((d) => !dishImage(d));
  return [...withImage, ...withoutImage].slice(0, count);
}

export function pickSignature(dishes, preferredName = '') {
  if (!dishes.length) return { dish: null, isSignature: false };
  if (preferredName) {
    const match = dishes.find(
      (d) => d.name?.trim().toLowerCase() === preferredName.trim().toLowerCase()
    );
    if (match) return { dish: match, isSignature: true };
  }
  return { dish: dishes.find((d) => dishImage(d)) || dishes[0], isSignature: false };
}

const TINTS = [
  { bg: '#f2d9cc', fg: '#8e2f14' },
  { bg: '#e9e2c8', fg: '#4f5b35' },
  { bg: '#f4e2bd', fg: '#9a6a12' },
  { bg: '#e6d6cf', fg: '#5b3a2e' },
];

/** Stable warm tint for dishes without a photo, so placeholders feel designed. */
export function tintFor(key = '') {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}
