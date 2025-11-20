const { sequelize, Service } = require("./models_sql");

async function seedPostgres() {
  try {
    console.log("🌱 Starting PostgreSQL service seeding...");

    await sequelize.sync();

    await Service.destroy({ where: {} });

    console.log("🗑️ Cleared old PostgreSQL services");

    const services = [
      { name: 'Plumbing', description: 'Fix leaks, unclog drains, and install pipes', price: 1500 },
      { name: 'Cleaning', description: 'Deep house cleaning, dusting, and vacuuming', price: 2500 },
      { name: 'Electrical', description: 'Wiring repairs, outlet installations, and lighting setup', price: 2000 },
      { name: 'Painting', description: 'Interior/exterior painting, wall touch-ups', price: 4500 },
      { name: 'Gardening', description: 'Lawn mowing, planting, weeding', price: 2200 },
      { name: 'HVAC Repair', description: 'AC/heating system fixes', price: 2500 },
      { name: 'Handyman', description: 'General repairs, furniture assembly', price: 3500 },
      { name: 'Carpentry', description: 'Woodwork repairs and furniture making', price: 3800 },
      { name: 'Pest Control', description: 'Safe pest elimination', price: 1800 },
      { name: 'Appliance Repair', description: 'Fixing refrigerators, washing machines, and more', price: 4200 },
      { name: 'Interior Design', description: 'Home decor consultation and styling advice', price: 3000 },
    ];

    await Service.bulkCreate(services);

    console.log("✨ PostgreSQL services added successfully!");
    process.exit();

  } catch (err) {
    console.error("❌ Seeding failed", err);
    process.exit(1);
  }
}

seedPostgres();
