const express = require("express");
const router = express.Router();
// Support both Mongo (Mongoose) and Postgres (Sequelize)
const dbType = process.env.DB_TYPE || 'mongo';
const models = dbType === 'postgres' ? require('../models_sql').compat : require('../models');
const Service = models.Service;

// GET /api/services - list all services
router.get("/", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    console.error("Services API error:", err);
    res.status(500).json({ error: "Failed to load services" });
  }
});

// GET /api/services/:id - single service
router.get("/:id", async (req, res) => {
  try {
    const svc = await Service.findById(req.params.id);
    if (!svc) return res.status(404).json({ error: "Service not found" });
    res.json(svc);
  } catch (err) {
    console.error("Service fetch error:", err);
    res.status(500).json({ error: "Failed to load service" });
  }
});

// POST /api/services - create (development helper)
router.post("/", async (req, res) => {
  try {
    const { name, description, price } = req.body;
    if (!name || price === undefined)
      return res.status(400).json({ error: "name & price required" });
    // create works for both mongoose and sequelize compat wrapper
    const s = await Service.create({ name, description, price });
    res.status(201).json(s);
  } catch (err) {
    console.error("Service create error:", err);
    res.status(500).json({ error: "Failed to create service" });
  }
});

module.exports = router;
