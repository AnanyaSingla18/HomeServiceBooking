const mongoose = require("mongoose");
const Service = require("./models/Service");

const MONGO_URI = "mongodb://localhost:27017/homeServiceDB";

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("🌱 Starting seed with more services in INR...");
    // Clear existing services (resets to fresh data)
    await Service.deleteMany({});
    console.log("🗑️ Cleared old services");

    // Insert 11 sample services (original 7 updated to INR + 4 new)
    const services = await Service.insertMany([
      // Original Services (Updated to INR)
      { name: "Plumbing", description: "Fix leaks, unclog drains, and install pipes", price: 1500 },
      { name: "Cleaning", description: "Deep house cleaning, dusting, and vacuuming", price: 2500 },
      { name: "Electrical", description: "Wiring repairs, outlet installations, and lighting setup", price: 2000 },
      { name: "Painting", description: "Interior/exterior painting, wall touch-ups, and color consultations", price: 4500 },
      { name: "Gardening", description: "Lawn mowing, planting, weeding, and garden maintenance", price: 2200 },
      { name: "HVAC Repair", description: "AC/heating system fixes, filter changes, and thermostat installation", price: 2500 },
      { name: "Handyman", description: "General repairs, furniture assembly, and small home fixes", price: 3500 },
      
      // New Services (in INR)
      { name: "Carpentry", description: "Woodwork repairs, furniture making, and cabinet installation", price: 3800 },
      { name: "Pest Control", description: "Safe pest elimination for home and kitchen areas", price: 1800 },
      { name: "Appliance Repair", description: "Fixing refrigerators, washing machines, and other appliances", price: 4200 },
      { name: "Interior Design", description: "Home decor consultation, layout planning, and styling advice", price: 3000 }
    ]);
    
    console.log(`✅ Added ${services.length} services to DB in INR!`);
    console.log("📋 Services added:");
    services.forEach(s => console.log(`  - ${s.name}: ₹${s.price} (${s.description})`));
    
    // Close connection
    mongoose.connection.close();
    console.log("🔌 Seed complete - DB closed.");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  });
