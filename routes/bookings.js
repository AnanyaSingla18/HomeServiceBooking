const express = require("express");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const router = express.Router();

// Helper: Validate contact details
const validateContact = (contactMethod, email, phone) => {
  if (contactMethod === 'email') {
    if (!email) return { valid: false, error: 'Email is required for email contact.' };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { valid: false, error: 'Please enter a valid email address.' };
  } else if (contactMethod === 'phone') {
    if (!phone) return { valid: false, error: 'Phone is required for phone contact.' };
    if (!/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(phone)) return { valid: false, error: 'Please enter a valid Indian phone number (10 digits, starting with 6-9).' };
  }
  return { valid: true };
};

// GET /api/bookings - List bookings (filter by user if session)
router.get("/", async (req, res) => {
  try {
    let query = {};
    // Filter by user if authenticated (from session)
    if (req.session && req.session.userId) {
      query.user = req.session.userId;
      console.log(`🔍 Fetching bookings for user: ${req.session.userName}`);
    } else {
      console.log("🔍 Fetching all bookings (public access - consider logging in)");
    }
    
    // Support filters: ?customerName=John (regex), ?serviceId=ID
    if (req.query.customerName) {
      query.customerName = { $regex: req.query.customerName, $options: 'i' };
    }
    if (req.query.serviceId) {
      query.service = req.query.serviceId;
    }

    const bookings = await Booking.find(query).populate("service").sort({ createdAt: -1 });
    console.log(`📋 Fetched ${bookings.length} bookings`);
    res.json(bookings);
  } catch (err) {
    console.error("GET bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// GET /api/bookings/:id - Single booking
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("service");
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    // Ownership check: Only allow if public or user's booking
    if (req.session && req.session.userId && booking.user && booking.user.toString() !== req.session.userId) {
      return res.status(403).json({ error: "Unauthorized to view this booking" });
    }
    console.log(`👁️ Viewed booking: ${req.params.id} by ${req.session?.userName || 'public'}`);
    res.json(booking);
  } catch (err) {
    console.error("GET booking error:", err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// POST /api/bookings - Create booking
router.post("/", async (req, res) => {
  try {
    const { service, customerName, date, contactMethod, email, phone, timeSlot } = req.body;
    
    // Required fields
    if (!service || !customerName || !date || !contactMethod || !timeSlot) {
      return res.status(400).json({ error: "Required fields: service, customerName, date, contactMethod, timeSlot" });
    }

    // Validate service exists
    const serviceDoc = await Service.findById(service);
    if (!serviceDoc) {
      return res.status(400).json({ error: "Invalid service ID" });
    }

    // Validate contact
    const contactValid = validateContact(contactMethod, email, phone);
    if (!contactValid.valid) {
      return res.status(400).json({ error: contactValid.error });
    }

    // Create booking (add user if session)
    const bookingData = {
      service,
      customerName,
      date: new Date(date),
      contactMethod,
      timeSlot,
      ...(contactMethod === 'email' && { email }),
      ...(contactMethod === 'phone' && { phone }),
      ...(req.session && req.session.userId && { user: req.session.userId })
    };

    const booking = new Booking(bookingData);
    await booking.save();

    // Populate for response
    const populatedBooking = await Booking.findById(booking._id).populate("service");
    console.log(`✅ Created booking: ${booking._id} for ${req.session?.userName || customerName}`);
    res.status(201).json(populatedBooking);
  } catch (err) {
    console.error("POST booking error:", err);
    res.status(400).json({ error: err.message || "Failed to create booking" });
  }
});

// PUT /api/bookings/:id - Update booking
router.put("/:id", async (req, res) => {
  try {
    const { service, customerName, date, contactMethod, email, phone, timeSlot } = req.body;
    
    // Required fields
    if (!customerName || !date || !contactMethod || !timeSlot) {
      return res.status(400).json({ error: "Required fields: customerName, date, contactMethod, timeSlot" });
    }

    // Validate contact
    const contactValid = validateContact(contactMethod, email, phone);
    if (!contactValid.valid) {
      return res.status(400).json({ error: contactValid.error });
    }

    // Find existing booking for ownership check
    const existingBooking = await Booking.findById(req.params.id);
    if (!existingBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    // Ownership check
    if (req.session && req.session.userId && existingBooking.user && existingBooking.user.toString() !== req.session.userId) {
      return res.status(403).json({ error: "Unauthorized to update this booking" });
    }

    // Update (service optional)
    const updateData = {
      ...(service && { service }),
      customerName,
      date: new Date(date),
      contactMethod,
      ...(contactMethod === 'email' && { email }),
      ...(contactMethod === 'phone' && { phone }),
      timeSlot
    };

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("service");

    console.log(`✏️ Updated booking: ${req.params.id} by ${req.session?.userName || 'public'}`);
    res.json(booking);
  } catch (err) {
    console.error("PUT booking error:", err);
    res.status(400).json({ error: err.message || "Failed to update booking" });
  }
});

// DELETE /api/bookings/:id - Delete booking
router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    // Ownership check
    if (req.session && req.session.userId && booking.user && booking.user.toString() !== req.session.userId) {
      return res.status(403).json({ error: "Unauthorized to delete this booking" });
    }

    await Booking.findByIdAndDelete(req.params.id);
    console.log(`🗑️ Deleted booking: ${req.params.id} by ${req.session?.userName || 'public'}`);
    res.json({ message: "Booking deleted successfully", id: req.params.id });
  } catch (err) {
    console.error("DELETE booking error:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

module.exports = router;
