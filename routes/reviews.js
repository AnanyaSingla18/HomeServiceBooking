const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const dbType = process.env.DB_TYPE || 'mongo';
const Booking = (dbType === 'postgres' ? require('../models_sql').compat : require('../models')).Booking;

router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(12).lean();
    res.json(reviews);
  } catch (err) {
    console.error('Reviews fetch error:', err);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { bookingId, customerName, contact, rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!bookingId || !customerName || !contact || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Booking, customer details, and a rating from 1 to 5 are required.' });
    }
    if (!comment || comment.trim().length < 10 || comment.trim().length > 500) {
      return res.status(400).json({ error: 'Review must be between 10 and 500 characters.' });
    }

    const booking = dbType === 'mongo'
      ? await Booking.findById(bookingId).populate('service')
      : await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Reviews are available after the service is completed.' });
    }

    const expectedContact = booking.contactMethod === 'email' ? booking.email : booking.phone;
    if (booking.customerName.trim().toLowerCase() !== customerName.trim().toLowerCase() || expectedContact !== contact.trim()) {
      return res.status(403).json({ error: 'The review details must match the booking.' });
    }

    const serviceName = booking.service && booking.service.name ? booking.service.name : 'Home service';
    const review = await Review.create({
      bookingId: String(bookingId),
      serviceName,
      customerName: booking.customerName,
      rating: numericRating,
      comment: comment.trim()
    });

    res.status(201).json({ review });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'This booking already has a review.' });
    console.error('Review creation error:', err);
    res.status(500).json({ error: 'Failed to save review.' });
  }
});

module.exports = router;
