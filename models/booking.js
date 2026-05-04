const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  customerName: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  contactMethod: { type: String, enum: ['email', 'phone'], required: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  timeSlot: { type: String, required: true },

  // admin approval fields
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);

