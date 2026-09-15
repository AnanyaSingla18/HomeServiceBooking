const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true, trim: true },
  serviceName: { type: String, required: true, trim: true },
  customerName: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
