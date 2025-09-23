const express = require("express");
const Service = require("../models/Service");
const router = express.Router();

// GET /api/services - List all services
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

module.exports = router;
