const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true }
}, { timestamps: true });  // Optional: Adds createdAt/updatedAt

// NEW: Defensive compile - Only if not already defined
const Service = mongoose.models.Service || mongoose.model("Service", serviceSchema);

module.exports = Service;
