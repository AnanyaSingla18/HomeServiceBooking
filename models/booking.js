const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User ' },  // NEW: Optional ref to User
  customerName: { type: String, required: true },
  date: { type: Date, required: true },
  contactMethod: { type: String, enum: ['email', 'phone'], required: true },
  email: { type: String },  // Optional, conditional
  phone: { type: String },  // Optional, conditional
  timeSlot: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
