require('dotenv').config();
const { sync, Service, User } = require('../models_sql');

async function run() {
  try {
    await sync();
    console.log('🔌 Connected & synced Postgres tables.');

    // Clear services
    await Service.destroy({ where: {} });
    console.log('🗑 Cleared services in Postgres.');

    const services = await Service.bulkCreate([
      { name: 'Plumbing', description: 'Fix leaks, unclog drains, and install pipes', price: 1500 },
      { name: 'Cleaning', description: 'Deep house cleaning, dusting, and vacuuming', price: 2500 },
      { name: 'Electrical', description: 'Wiring repairs, outlet installations, and lighting setup', price: 2000 },
      { name: 'Painting', description: 'Interior/exterior painting, wall touch-ups, and color consultations', price: 4500 },
      { name: 'Gardening', description: 'Lawn mowing, planting, weeding, and garden maintenance', price: 2200 },
      { name: 'HVAC Repair', description: 'AC/heating system fixes, filter changes, and thermostat installation', price: 2500 },
      { name: 'Handyman', description: 'General repairs, furniture assembly, and small home fixes', price: 3500 },
      { name: 'Carpentry', description: 'Woodwork repairs, furniture making, and cabinet installation', price: 3800 },
      { name: 'Pest Control', description: 'Safe pest elimination for home and kitchen areas', price: 1800 },
      { name: 'Appliance Repair', description: 'Fixing refrigerators, washing machines, and other appliances', price: 4200 },
      { name: 'Interior Design', description: 'Home decor consultation, layout planning, and styling advice', price: 3000 }
    ]);

    console.log(`✅ Added ${services.length} services to Postgres DB.`);

    // Ensure admin account
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'ananya@gmail.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || '2310990108';

    const [admin, created] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: { name: 'Administrator', password: adminPassword, role: 'admin' }
    });

    if (created) console.log(`✅ Created admin user for Postgres: ${adminEmail}`);
    else console.log(`ℹ️ Admin already exists in Postgres: ${adminEmail}`);

    console.log('🔌 Postgres seed finished.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed SQL failed:', err);
    process.exit(1);
  }
}

run();
