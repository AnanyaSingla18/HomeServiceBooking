const express = require("express");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const router = express.Router();

// Helper: Validate contact details based on method
function validateContact(contactMethod, email, phone) {
  if (contactMethod === 'email') {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return { valid: false, error: "Please enter a valid email address." };
    }
  } else if (contactMethod === 'phone') {
    if (!phone || !/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(phone)) {
      return { valid: false, error: "Please enter a valid Indian phone number (10 digits, starting with 6-9)." };
    }
  }
  return { valid: true };
}

// GET /api/bookings - List all bookings (with optional query filter)
router.get("/", async (req, res) => {
  try {
    const { customerName, serviceId } = req.query;  // Optional filters
    let query = {};
    if (customerName) query.customerName = { $regex: customerName, $options: 'i' };
    if (serviceId) query.service = serviceId;

    const bookings = await Booking.find(query).populate("service").sort({ createdAt: -1 });
    console.log(`📋 Fetched ${bookings.length} bookings`);
    res.json(bookings);
  } catch (err) {
    console.error("GET bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// GET /api/bookings/:id - Get single booking by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate("service");
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    console.log(`🔍 Fetched booking: ${booking._id}`);
    res.json(booking);
  } catch (err) {
    console.error("GET booking by ID error:", err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// POST /api/bookings - Create new booking
router.post("/", async (req, res) => {
  try {
    const { service: serviceId, customerName, date, contactMethod, email, phone, timeSlot } = req.body;
    
    // Basic validation
    if (!serviceId || !customerName || !date || !contactMethod || !timeSlot) {
      return res.status(400).json({ error: "Missing required fields: service, customerName, date, contactMethod, timeSlot" });
    }

    // Validate service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(400).json({ error: "Invalid service ID" });
    }

    // Conditional contact validation
    const contactValidation = validateContact(contactMethod, email, phone);
    if (!contactValidation.valid) {
      return res.status(400).json({ error: contactValidation.error });
    }

    // Create and save
    const booking = new Booking({ 
      service: serviceId, 
      customerName, 
      date: new Date(date), 
      contactMethod,
      email: contactMethod === 'email' ? email : undefined,
      phone: contactMethod === 'phone' ? phone : undefined,
      timeSlot
    });
    await booking.save();

    // Populate for response
    const populatedBooking = await Booking.findById(booking._id).populate("service");
    console.log("✅ Created booking:", booking._id);
    res.status(201).json(populatedBooking);
  } catch (err) {
    console.error("POST booking error:", err);
    res.status(400).json({ error: err.message || "Failed to create booking" });
  }
});

// PUT /api/bookings/:id - Update existing booking (full update)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { service: serviceId, customerName, date, contactMethod, email, phone, timeSlot } = req.body;
    
    // Basic validation (allow partial, but check provided fields)
    if (!customerName || !date || !contactMethod || !timeSlot) {
      return res.status(400).json({ error: "Required fields: customerName, date, contactMethod, timeSlot" });
    }

    // Validate service if provided
    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(400).json({ error: "Invalid service ID" });
      }
    }

    // Conditional contact validation (if method changed/provided)
    const contactValidation = validateContact(contactMethod, email, phone);
    if (!contactValidation.valid) {
      return res.status(400).json({ error: contactValidation.error });
    }

    // Update
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { 
        service: serviceId, 
        customerName, 
        date: new Date(date), 
        contactMethod,
        email: contactMethod === 'email' ? email : undefined,
        phone: contactMethod === 'phone' ? phone : undefined,
        timeSlot
      },
      { new: true, runValidators: true }
    ).populate("service");

    if (!updatedBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    console.log(`✏️ Updated booking: ${updatedBooking._id}`);
    res.json(updatedBooking);
  } catch (err) {
    console.error("PUT booking error:", err);
    res.status(400).json({ error: err.message || "Failed to update booking" });
  }
});

// DELETE /api/bookings/:id - Delete booking by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBooking = await Booking.findByIdAndDelete(id);
    if (!deletedBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    console.log(`🗑️ Deleted booking: ${deletedBooking._id} (${deletedBooking.customerName})`);
    res.json({ message: "Booking deleted successfully", deleted: deletedBooking });
  } catch (err) {
    console.error("DELETE booking error:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

module.exports = router;
