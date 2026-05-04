const express = require('express');
const router = express.Router();
const dbType = process.env.DB_TYPE || 'mongo';

const models = dbType === 'postgres'
  ? require('../models_sql').compat
  : require('../models');

const Booking = models.Booking;
const Service = models.Service;
const User = models.User;

const sqlRaw = dbType === 'postgres' ? require('../models_sql') : null;

const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Admin login page
router.get('/login', (req, res) => {
  res.render('admin-login', { error: null });
});

// Admin login POST
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.render('admin-login', { error: 'Email and password required' });

    let user;

    // 🔥 USE COMPAT LAYER PROPERLY
    if (dbType === 'postgres') {
      user = await User.findOne({ email });   // <-- FIXED
    } else {
      user = await User.findOne({ email }).select('+password');
    }

    if (!user)
      return res.render('admin-login', { error: 'Invalid credentials' });

    // 🔥 PASSWORD CHECK (use bcrypt for all DBs)
    const match = await user.comparePassword(password);
    if (!match) {
      return res.render('admin-login', { error: 'Invalid credentials' });
    }

    if (user.role !== 'admin')
      return res.render('admin-login', { error: 'Not an admin' });

    // 🔥 Token creation
    const token = jwt.sign(
      { id: user.id || user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.redirect('/admin/bookings');

  } catch (err) {
    console.error('Admin login error:', err);
    res.render('admin-login', { error: 'Login failed' });
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// Admin bookings list
router.get('/bookings', auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin')
      return res.status(403).send('Forbidden');

    const bookings = await Booking.find();

    res.render('admin-bookings', {
      bookings,
      admin: req.user
    });
  } catch (err) {
    console.error('Admin bookings error:', err);
    res.status(500).send('Error loading bookings');
  }
});

// Approve booking
router.post('/bookings/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const id = req.params.id;

    if (dbType === 'postgres') {
      const { Booking: BookingModel } = sqlRaw;
      const b = await BookingModel.findByPk(id);
      if (!b) return res.status(404).json({ error: 'Booking not found' });

      b.status = 'approved';
      b.approvedById = req.user.id || req.user._id;
      b.approvedAt = new Date();
      await b.save();

      return res.json({ success: true, booking: b.toJSON() });
    }

    // MongoDB
    const b = await Booking.findById(id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });

    b.status = 'approved';
    b.approvedBy = req.user._id || req.user.id;
    b.approvedAt = new Date();
    await b.save();

    res.json({ success: true, booking: b });

  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

// Reject booking
router.post('/bookings/:id/reject', auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const id = req.params.id;

    if (dbType === 'postgres') {
      const { Booking: BookingModel } = sqlRaw;
      const b = await BookingModel.findByPk(id);
      if (!b) return res.status(404).json({ error: 'Booking not found' });

      b.status = 'rejected';
      b.approvedById = req.user.id || req.user._id;
      b.approvedAt = new Date();
      await b.save();

      return res.json({ success: true, booking: b.toJSON() });
    }

    // MongoDB
    const b = await Booking.findById(id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });

    b.status = 'rejected';
    b.approvedBy = req.user._id || req.user.id;
    b.approvedAt = new Date();
    await b.save();

    res.json({ success: true, booking: b });

  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Failed to reject' });
  }
});

module.exports = router;
