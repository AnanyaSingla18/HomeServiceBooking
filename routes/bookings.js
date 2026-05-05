const express = require('express');
const router = express.Router();
const dbType = process.env.DB_TYPE || 'mongo';
const models = dbType === 'postgres' ? require('../models_sql').compat : require('../models');
const Booking = models.Booking;
const Service = models.Service;
const auth = require('../middleware/auth');

// GET /api/bookings - list bookings (populated)
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (err) {
    console.error('Bookings API error:', err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    res.json(b);
  } catch (err) {
    console.error('Booking fetch error:', err);
    res.status(500).json({ error: 'Failed to load booking' });
  }
});

// POST /api/bookings - protected route: create booking (requires JWT)
router.post('/', auth, async (req, res) => {
  try {
    const { service: serviceId, customerName, date, contactMethod, email, phone, timeSlot } = req.body;
    if (!serviceId || !customerName || !date || !contactMethod || !timeSlot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    // Simple contact validation
    if (contactMethod === 'email' && (!email || !/^\S+@\S+\.\S+$/.test(email))) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (contactMethod === 'phone' && (!phone || !/^(\+91[\-\s]?)?[6-9]\d{9}$/.test(phone))) {
      return res.status(400).json({ error: 'Invalid phone' });
    }

    // Prepare payloads for both databases
    const mongoPayload = {
      service: serviceId,
      customerName,
      date: new Date(date),
      contactMethod,
      email: contactMethod === 'email' ? email : undefined,
      phone: contactMethod === 'phone' ? phone : undefined,
      timeSlot
    };

    // For PostgreSQL, find the service by name to get the SQL serviceId
    let sqlServiceId = null;
    try {
      const sqlModels = require('../models_sql');
      const sqlService = await sqlModels.Service.findOne({ where: { name: service.name } });
      if (sqlService) {
        sqlServiceId = sqlService.id;
      }
    } catch (err) {
      console.error('Error finding SQL service:', err);
    }

    const sqlPayload = {
      serviceId: sqlServiceId,
      customerName,
      date: new Date(date),
      contactMethod,
      amount: service.price,
      email: contactMethod === 'email' ? email : undefined,
      phone: contactMethod === 'phone' ? phone : undefined,
      timeSlot
    };

    // Save to both databases
    let mongoBooking = null;
    let sqlBooking = null;

    try {
      // Save to MongoDB
      const MongoBooking = require('../models/booking');
      mongoBooking = await MongoBooking.create(mongoPayload);
    } catch (mongoErr) {
      console.error('MongoDB save error:', mongoErr);
    }

    try {
      // Save to PostgreSQL
      const sqlModels = require('../models_sql');
      if (sqlServiceId) {
        sqlBooking = await sqlModels.Booking.create(sqlPayload);
      }
    } catch (sqlErr) {
      console.error('PostgreSQL save error:', sqlErr);
    }

    // Use the booking from the primary DB for response
    const primaryBooking = dbType === 'postgres' ? sqlBooking : mongoBooking;
    if (!primaryBooking) {
      return res.status(500).json({ error: 'Failed to save booking to any database' });
    }

    // Populate for response
    const populated = (dbType === 'postgres') ? await Booking.findById(primaryBooking._id || primaryBooking.id) : await Booking.findById(primaryBooking._id).populate('service');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

module.exports = router;
