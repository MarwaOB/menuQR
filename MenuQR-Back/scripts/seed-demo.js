/**
 * Demo data for trying the app: menus, dishes (with photos), clients and
 * ~30 days of orders so the dashboard, analytics, home page and customer
 * menu all have something to show.
 *
 *   node scripts/seed-demo.js           # add demo data
 *   node scripts/seed-demo.js --clean   # remove exactly what was added
 *
 * Everything inserted is recorded in scripts/.demo-seed.json; --clean deletes
 * only those rows, so real data entered alongside it is never touched.
 * Note: menus are not scoped per restaurant, so every account sees them.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const MANIFEST = path.join(__dirname, '.demo-seed.json');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
});

const SECTIONS = ['Drinks', 'Starters', 'Main Course', 'Desserts', 'Sides', 'Sauces'];

const photo = (id) => `https://images.unsplash.com/photo-${id}?w=1200&h=900&fit=crop&q=80&auto=format`;

// [name, description, price (DZD), section, photo id | null]
const DISHES = {
  mezze: ['Mezze platter', 'Grilled halloumi, flatbread, olives and a trio of dips to share.', 950, 'Starters', '1476224203421-9ac39bcb3327'],
  kefta: ['Kefta meatballs', 'Spiced lamb and beef, cumin, fresh herbs, served on crisp leaves.', 750, 'Starters', '1529042410759-befb1204b468'],
  fattoush: ['Fattoush salad', 'Romaine, tomato, radish, toasted bread, sumac and pomegranate dressing.', 600, 'Starters', '1505253716362-afaea1d3d1af'],
  pea_soup: ['Spring pea velouté', 'Silky pea soup, mint oil and a parmesan crisp.', 550, 'Starters', '1626200419199-391ae4be7a41'],
  garden_bowl: ['Garden bowl', 'Roasted squash, avocado, chickpeas, beets and seeds.', 850, 'Starters', '1512621776951-a57141f2eefd'],
  tajine: ['Lamb tajine', 'Slow-cooked lamb with carrots, potatoes and preserved lemon.', 1800, 'Main Course', '1541518763669-27fef04b14ea'],
  mixed_grill: ['Mixed grill', 'Chicken, kefta and lamb skewers, grilled peppers and toum.', 2200, 'Main Course', '1555939594-58d7cb561ad1'],
  steak_frites: ['Steak frites', 'Charred flank steak, herb butter and hand-cut fries.', 2600, 'Main Course', '1600891964092-4316c288032e'],
  shrimp_pasta: ['Shrimp spaghetti', 'Garlic shrimp, cherry tomatoes, chili and parsley.', 1900, 'Main Course', '1563379926898-05f4575a45d8'],
  seafood_stew: ['Seafood stew', 'Prawns and white fish in a saffron broth, with rice.', 2100, 'Main Course', '1559847844-5315695dadae'],
  pappardelle: ['Pappardelle ragù', 'Fresh ribbons of pasta, slow beef ragù, aged cheese.', 1700, 'Main Course', '1611270629569-8b357cb88da9'],
  salmon_bowl: ['Salmon bowl', 'Seared salmon, egg, edamame, corn and pickled cabbage.', 2000, 'Main Course', '1546069901-ba9599a7e63c'],
  ribs: ['Smoked short ribs', 'Twelve-hour smoked ribs, tomato salad and pickles.', 2400, 'Main Course', '1544025162-d76694265947'],
  flatbread: ['Chicken flatbread', 'Wood-fired flatbread, chicken, peppers and red onion.', 1400, 'Main Course', '1565299624946-b28f40a0ae38'],
  couscous: ['Herbed couscous', 'Fluffy couscous, roasted vegetables and fresh herbs.', 500, 'Sides', '1547592180-85f173990554'],
  fries: ['Hand-cut fries', 'Twice-cooked, sea salt and paprika.', 350, 'Sides', null],
  tiramisu: ['Tiramisu', 'Espresso-soaked biscuits, mascarpone cream, cocoa.', 650, 'Desserts', '1571877227200-a0d98ea607e9'],
  panna_cotta: ['Strawberry panna cotta', 'Vanilla cream set with fresh strawberries.', 550, 'Desserts', '1488477181946-6428a0291777'],
  pancakes: ['Honey pancakes', 'Fluffy pancakes, banana, honey and mint.', 600, 'Desserts', '1567620905732-2d1ec7ab7445'],
  donuts: ['Glazed doughnuts', 'Chocolate and sprinkles, two per serving.', 400, 'Desserts', '1551024601-bec78aea704b'],
  iced_tea: ['Iced lemon tea', 'Black tea, lime and a touch of cane sugar.', 300, 'Drinks', '1556679343-c7306c1976bc'],
  mint_tea: ['Mint tea', 'Green tea brewed with fresh mint.', 200, 'Drinks', null],
  orange_juice: ['Fresh orange juice', 'Squeezed to order.', 350, 'Drinks', null],
  lemonade: ['Mint lemonade', 'Lemon, fresh mint and sparkling water.', 300, 'Drinks', null],
  harissa: ['Harissa', 'House chili paste, smoky and bright.', 100, 'Sauces', null],
  toum: ['Toum', 'Whipped garlic sauce.', 100, 'Sauces', null],
};

// Newest first; today's menu is what the home page and customers see.
const MENUS = [
  { name: 'Autumn Menu', daysAgo: 0, dishes: ['mezze', 'kefta', 'fattoush', 'pea_soup', 'tajine', 'mixed_grill', 'steak_frites', 'shrimp_pasta', 'seafood_stew', 'couscous', 'fries', 'tiramisu', 'panna_cotta', 'iced_tea', 'mint_tea', 'orange_juice', 'harissa', 'toum'] },
  { name: 'Weekend Brunch', daysAgo: 4, dishes: ['garden_bowl', 'fattoush', 'salmon_bowl', 'flatbread', 'pancakes', 'donuts', 'panna_cotta', 'orange_juice', 'lemonade', 'mint_tea'] },
  { name: 'Grill Night', daysAgo: 11, dishes: ['kefta', 'mezze', 'mixed_grill', 'ribs', 'steak_frites', 'flatbread', 'couscous', 'fries', 'tiramisu', 'iced_tea', 'lemonade', 'harissa', 'toum'] },
  { name: 'Summer Menu', daysAgo: 22, dishes: ['garden_bowl', 'pea_soup', 'fattoush', 'pappardelle', 'shrimp_pasta', 'salmon_bowl', 'seafood_stew', 'couscous', 'panna_cotta', 'tiramisu', 'iced_tea', 'lemonade'] },
];

const ADDRESSES = [
  ['12 Rue Didouche Mourad, Algiers', '0555 12 34 56'],
  ['Cité 1000 Logements, Bab Ezzouar', '0661 98 76 54'],
  ['45 Boulevard Krim Belkacem, Algiers', '0770 11 22 33'],
  ['Hydra, Rue des Pins 8', '0550 44 55 66'],
];

// Deterministic randomness so re-seeding gives the same picture.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

const dayStart = (daysAgo) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
};
const localDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function seedDemo() {
  if (fs.existsSync(MANIFEST)) {
    console.log('Demo data is already seeded (scripts/.demo-seed.json exists). Run with --clean first to reseed.');
    return;
  }

  const created = { sections: [], menus: [], dishes: [], images: [], internalClients: [], externalClients: [], orders: [] };

  await pool.withTransaction(async (client) => {
    // Sections the app expects (the schema's defaults; may be missing on a fresh DB).
    const sectionIds = {};
    for (const name of SECTIONS) {
      const { rows } = await client.query(
        'INSERT INTO Section (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id',
        [name]
      );
      if (rows[0]) created.sections.push(rows[0].id);
      const { rows: [s] } = await client.query('SELECT id FROM Section WHERE name = $1', [name]);
      sectionIds[name] = s.id;
    }

    // Menus + dishes + photos.
    const menus = [];
    for (const menu of MENUS) {
      const { rows: [m] } = await client.query('INSERT INTO Menu (name, date) VALUES ($1, $2) RETURNING id', [
        menu.name,
        localDate(dayStart(menu.daysAgo)),
      ]);
      created.menus.push(m.id);
      const dishes = [];
      for (const key of menu.dishes) {
        const [name, description, price, section, photoId] = DISHES[key];
        const { rows: [d] } = await client.query(
          'INSERT INTO Dish (name, description, price, section_id, menu_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [name, description, price, sectionIds[section], m.id]
        );
        created.dishes.push(d.id);
        if (photoId) {
          const { rows: [img] } = await client.query(
            'INSERT INTO DishImage (dish_id, image_url) VALUES ($1, $2) RETURNING id',
            [d.id, photo(photoId)]
          );
          created.images.push(img.id);
        }
        dishes.push({ id: d.id, section, price });
      }
      menus.push({ ...menu, id: m.id, dishes });
    }

    // Clients: twelve tables and a few delivery customers.
    const tables = [];
    for (let n = 1; n <= 12; n++) {
      const { rows: [c] } = await client.query(
        'INSERT INTO InternalClient (table_number, session_token) VALUES ($1, $2) RETURNING id',
        [n, `demo-seed-table-${n}-${Date.now()}`]
      );
      created.internalClients.push(c.id);
      tables.push(c.id);
    }
    const deliveries = [];
    for (const [i, [address, phone]] of ADDRESSES.entries()) {
      const { rows: [c] } = await client.query(
        'INSERT INTO ExternalClient (address, phone_number, session_token) VALUES ($1, $2, $3) RETURNING id',
        [address, phone, `demo-seed-delivery-${i}-${Date.now()}`]
      );
      created.externalClients.push(c.id);
      deliveries.push(c.id);
    }

    // Orders over the last 30 days, against whichever menu was current that day.
    // MENUS is newest first, so the first one dated on/before that day was current then.
    const menuForDay = (daysAgo) => menus.find((m) => m.daysAgo >= daysAgo) || menus[menus.length - 1];
    const itemsFor = (menu) => {
      const mains = menu.dishes.filter((d) => d.section === 'Main Course' || d.section === 'Starters');
      const extras = menu.dishes.filter((d) => !['Main Course', 'Starters'].includes(d.section));
      const chosen = new Map();
      const n = int(1, 3);
      for (let i = 0; i < n; i++) chosen.set(pick(mains).id, int(1, 3));
      if (rand() < 0.7 && extras.length) chosen.set(pick(extras).id, int(1, 4));
      return [...chosen.entries()];
    };

    for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
      const menu = menuForDay(daysAgo);
      const weekend = [5, 6].includes(dayStart(daysAgo).getDay());
      const count = daysAgo === 0 ? 7 : int(3, 6) + (weekend ? 3 : 0);
      for (let i = 0; i < count; i++) {
        const at = dayStart(daysAgo);
        // Lunch and dinner peaks; today's orders are in the last few hours.
        if (daysAgo === 0) at.setTime(Date.now() - int(2, 240) * 60000);
        else at.setHours(rand() < 0.45 ? int(12, 14) : int(19, 22), int(0, 59), int(0, 59));

        let status = rand() < 0.08 ? 'cancelled' : 'served';
        if (daysAgo === 0 && i < 3) status = 'pending';

        const external = rand() < 0.25;
        const { rows: [o] } = await client.query(
          `INSERT INTO OrderTable (status, type, menu_id, internal_client_id, external_client_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
          [status, external ? 'external' : 'internal', menu.id, external ? null : pick(tables), external ? pick(deliveries) : null, at]
        );
        created.orders.push(o.id);
        for (const [dishId, quantity] of itemsFor(menu)) {
          await client.query(
            `INSERT INTO OrderItem (order_id, dish_id, quantity, special_requests, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $6)`,
            [o.id, dishId, quantity, rand() < 0.15 ? pick(['No onions, please', 'Extra spicy', 'Sauce on the side']) : '', status, at]
          );
        }
      }
    }
  });

  fs.writeFileSync(MANIFEST, JSON.stringify(created, null, 2));
  console.log(
    `Seeded ${created.menus.length} menus, ${created.dishes.length} dishes (${created.images.length} with photos), ` +
      `${created.orders.length} orders, ${created.internalClients.length} tables, ${created.externalClients.length} delivery clients` +
      (created.sections.length ? `, ${created.sections.length} sections` : '') +
      '.'
  );
}

async function cleanDemo() {
  if (!fs.existsSync(MANIFEST)) {
    console.log('Nothing to clean (scripts/.demo-seed.json not found).');
    return;
  }
  const c = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  await pool.withTransaction(async (client) => {
    // Children first. Orders placed later through the app against demo menus
    // would block the menu delete, so those are removed with the menus too.
    await client.query('DELETE FROM OrderItem WHERE order_id = ANY($1) OR dish_id = ANY($2)', [c.orders, c.dishes]);
    await client.query('DELETE FROM OrderTable WHERE id = ANY($1) OR menu_id = ANY($2)', [c.orders, c.menus]);
    await client.query('DELETE FROM InternalClient WHERE id = ANY($1)', [c.internalClients]);
    await client.query('DELETE FROM ExternalClient WHERE id = ANY($1)', [c.externalClients]);
    await client.query('DELETE FROM DishImage WHERE id = ANY($1) OR dish_id = ANY($2)', [c.images, c.dishes]);
    await client.query('DELETE FROM Dish WHERE id = ANY($1) OR menu_id = ANY($2)', [c.dishes, c.menus]);
    await client.query('DELETE FROM Menu WHERE id = ANY($1)', [c.menus]);
    // Sections are the app's defaults; they are left in place.
  });
  fs.unlinkSync(MANIFEST);
  console.log('Demo data removed.');
}

pool.withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

(process.argv.includes('--clean') ? cleanDemo() : seedDemo())
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
