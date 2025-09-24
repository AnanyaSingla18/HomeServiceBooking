const express = require("express");
const Service = require("../models/Service");
const router = express.Router();

// GET /api/services - List all (public)
router.get("/", async (req, res) => {
  try {
    const services = await Service.find();
    console.log(`🔧 Fetched ${services.length} services`);
    res.json(services);
  } catch (err) {
    console.error("GET services error:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// POST /api/services - Create (admin-only in prod, but public for demo)
router.post("/", async (req, res) => {
  try {
    const { name, price, description } = req.body;
    if (!name || !price || price < 0) {
      return res.status(400).json({ error: "Required: name (string), price (positive number), description (optional)" });
    }
    const service = new Service({ name, price, description });
    await service.save();
    console.log("✅ Created service:", service._id);
    res.status(201).json(service);
  } catch (err) {
    console.error("POST service error:", err);
    res.status(400).json({ error: err.message || "Failed to create service" });
  }
});

module.exports = router;
