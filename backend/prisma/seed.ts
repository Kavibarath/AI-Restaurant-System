import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BRANCH_ID = 'default-branch';
const SEED_DAYS = 60;
const BASE_DAILY_ORDERS = 12;

// Deterministic PRNG (mulberry32) so every seed run produces the same demo data
let rngState = 20260612;
const random = () => {
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const chance = (p: number) => random() < p;
const pick = <T>(arr: T[]) => arr[Math.floor(random() * arr.length)];

// ============= MENU (prices in Rs.) =============
const MENU = [
  { key: 'burger', name: 'Chicken Burger', category: 'Mains', price: 1200, description: 'Grilled chicken, cheese & house sauce' },
  { key: 'pizza', name: 'Margherita Pizza', category: 'Mains', price: 2400, description: 'Tomato, mozzarella & basil' },
  { key: 'pasta', name: 'Creamy Chicken Pasta', category: 'Mains', price: 1800, description: 'Penne in garlic cream sauce' },
  { key: 'kottu', name: 'Chicken Kottu', category: 'Mains', price: 1100, description: 'Chopped roti with chicken & vegetables' },
  { key: 'friedrice', name: 'Chicken Fried Rice', category: 'Mains', price: 1300, description: 'Wok-fried rice with egg & chicken' },
  { key: 'fries', name: 'French Fries', category: 'Sides', price: 600, description: 'Crispy salted fries' },
  { key: 'garlicbread', name: 'Garlic Bread', category: 'Sides', price: 550, description: 'Toasted with garlic butter' },
  { key: 'salad', name: 'Caesar Salad', category: 'Sides', price: 900, description: 'Romaine, parmesan & croutons' },
  { key: 'coke', name: 'Coca-Cola', category: 'Drinks', price: 350, description: '330ml can' },
  { key: 'lime', name: 'Fresh Lime Juice', category: 'Drinks', price: 450, description: 'Freshly squeezed' },
  { key: 'icedcoffee', name: 'Iced Coffee', category: 'Drinks', price: 650, description: 'Cold brew with milk' },
  { key: 'lavacake', name: 'Chocolate Lava Cake', category: 'Desserts', price: 850, description: 'Warm molten chocolate centre' },
  { key: 'watalappan', name: 'Watalappan', category: 'Desserts', price: 600, description: 'Traditional jaggery custard' },
];

// Anchor main dish -> weight of being ordered
const MAIN_WEIGHTS: Record<string, number> = {
  burger: 0.3, pizza: 0.2, kottu: 0.2, friedrice: 0.18, pasta: 0.12,
};

// Planted basket patterns the recommender should discover: main -> [item, probability]
const COMPLEMENTS: Record<string, [string, number][]> = {
  burger: [['fries', 0.75], ['coke', 0.6]],
  pizza: [['garlicbread', 0.65], ['coke', 0.4], ['lavacake', 0.3]],
  pasta: [['garlicbread', 0.55], ['salad', 0.45], ['icedcoffee', 0.25]],
  kottu: [['lime', 0.6], ['watalappan', 0.35]],
  friedrice: [['coke', 0.5], ['lime', 0.25]],
};

const CUSTOMERS = [
  'Nimal Perera', 'Kasun Silva', 'Tharushi Fernando', 'Dilan Jayawardena', 'Ishara Wickramasinghe',
  'Sajith Bandara', 'Hiruni Rajapaksa', 'Pradeep Kumar', 'Anjali Nadarajah', 'Ravindu Gunasekara',
  'Shalini Ratnam', 'Mohamed Rizwan', 'Chathura Dissanayake', 'Lakshika Herath', 'Arjun Sivakumar',
];

// Monday=0 ... Sunday=6 (same weekly pattern the demand model was trained on)
const DOW_FACTOR = [0.85, 0.85, 0.9, 0.95, 1.2, 1.35, 1.25];
const HOLIDAYS = ['01-01', '02-04', '04-13', '04-14', '05-01', '12-25'];

const pickWeighted = (weights: Record<string, number>) => {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let r = random() * total;
  for (const [key, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return key;
  }
  return Object.keys(weights)[0];
};

async function seedMenu() {
  const ids: Record<string, { id: string; price: number }> = {};
  for (const item of MENU) {
    const id = `seed-menu-${item.key}`;
    await prisma.menuItem.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        branchId: BRANCH_ID,
      },
    });
    ids[item.key] = { id, price: item.price };
  }
  console.log(`✅ Menu items ready: ${MENU.length}`);
  return ids;
}

async function seedCustomers() {
  const ids: string[] = [];
  for (const name of CUSTOMERS) {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    const customer = await prisma.customer.upsert({
      where: { email },
      update: {},
      create: { email, name },
    });
    ids.push(customer.id);
  }
  const walkIn = await prisma.customer.upsert({
    where: { email: 'walk-in@restaurant.local' },
    update: {},
    create: { email: 'walk-in@restaurant.local', name: 'Walk-in Customer' },
  });
  console.log(`✅ Customers ready: ${ids.length} + walk-in`);
  return { customerIds: ids, walkInId: walkIn.id };
}

async function seedOrders(
  menu: Record<string, { id: string; price: number }>,
  customerIds: string[],
  walkInId: string
) {
  const existing = await prisma.order.count({ where: { id: { startsWith: 'seed-order-' } } });
  if (existing > 0) {
    console.log(`⏭️  Demo orders already exist (${existing}) - skipping`);
    return;
  }

  const orders: any[] = [];
  const orderItems: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = SEED_DAYS; dayOffset >= 0; dayOffset--) {
    const day = new Date(today.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const dow = (day.getDay() + 6) % 7;
    const mmdd = `${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const holiday = HOLIDAYS.includes(mmdd) ? 1.4 : 1;
    const growth = 1 + 0.1 * ((SEED_DAYS - dayOffset) / SEED_DAYS);
    const count = Math.max(
      1,
      Math.round(BASE_DAILY_ORDERS * DOW_FACTOR[dow] * holiday * growth * (0.85 + random() * 0.3))
    );

    for (let n = 0; n < count; n++) {
      const orderId = `seed-order-${orders.length + 1}`;
      const main = pickWeighted(MAIN_WEIGHTS);
      const basket = new Map<string, number>([[main, chance(0.2) ? 2 : 1]]);

      for (const [item, p] of COMPLEMENTS[main]) {
        if (chance(p)) basket.set(item, chance(0.15) ? 2 : 1);
      }
      // A little random noise so not every basket follows the pattern
      if (chance(0.15)) basket.set(pick(['coke', 'lime', 'icedcoffee']), 1);
      if (chance(0.1)) basket.set(pick(['lavacake', 'watalappan']), 1);

      let total = 0;
      basket.forEach((qty, key) => {
        total += menu[key].price * qty;
        orderItems.push({ orderId, menuItemId: menu[key].id, quantity: qty, price: menu[key].price });
      });

      const createdAt = new Date(day);
      createdAt.setHours(11 + Math.floor(random() * 11), Math.floor(random() * 60));

      let status = chance(0.93) ? 'completed' : 'cancelled';
      if (dayOffset === 0 && chance(0.5)) status = 'pending';

      orders.push({
        id: orderId,
        customerId: chance(0.4) ? walkInId : pick(customerIds),
        branchId: BRANCH_ID,
        totalAmount: total,
        status,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  for (let i = 0; i < orders.length; i += 500) {
    await prisma.order.createMany({ data: orders.slice(i, i + 500) });
  }
  for (let i = 0; i < orderItems.length; i += 1000) {
    await prisma.orderItem.createMany({ data: orderItems.slice(i, i + 1000) });
  }
  console.log(`✅ Demo orders created: ${orders.length} (${orderItems.length} line items)`);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Create default branch
  const defaultBranch = await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    update: {},
    create: {
      id: BRANCH_ID,
      name: 'Main Branch',
      location: 'Downtown',
    },
  });
  console.log('✅ Default branch created:', defaultBranch.name);

  // Member A: Sales demo data
  const menu = await seedMenu();
  const { customerIds, walkInId } = await seedCustomers();
  await seedOrders(menu, customerIds, walkInId);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
