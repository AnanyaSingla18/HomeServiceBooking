const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  contactMethod: {
    type: String,
    enum: ["email", "phone"],
    required: true
  },
  // NEW: Contact Details (Conditional)
  email: {
    type: String,
    required: false,  // Required only if contactMethod='email'
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address.']
  },
  phone: {
    type: String,
    required: false,  // Required only if contactMethod='phone'
    trim: true,
    match: [/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/, 'Please enter a valid Indian phone number (10 digits, starting with 6-9).']  // India-specific
  },
  // NEW: Preferred Time Slot
  timeSlot: {
    type: String,
    enum: ["morning", "afternoon", "evening"],
    required: true
  }
}, {
  timestamps: true  // Auto-add createdAt/updatedAt
});

module.exports = mongoose.model("Booking", bookingSchema);
