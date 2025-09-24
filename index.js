const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const Booking = require("./models/Booking");
const Service = require("./models/Service");
const app = express();
const port = 3000;

// Connect to Local MongoDB
const MONGO_URI = "mongodb://localhost:27017/homeServiceDB";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to Local MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Home route
app.get("/", (req, res) => {
  res.render("index");
});

// Services route (public)
app.get("/services", async (req, res) => {
  try {
    const services = await Service.find();
    res.render("services", { services });
  } catch (err) {
    console.error("Services fetch error:", err);
    res.status(500).send("Error loading services");
  }
});

// Booking Form (public)
app.get("/booking", async (req, res) => {
  try {
    const serviceId = req.query.serviceId;
    let service = null;
    if (serviceId) {
      service = await Service.findById(serviceId);
    }
    res.render("booking", { 
      serviceId, 
      service, 
      error: null,
      customerName: "",
      date: "",
      contactMethod: "",
      email: "",
      phone: "",
      timeSlot: ""
    });
  } catch (err) {
    console.error("Booking form error:", err);
    res.status(500).send("Error loading form");
  }
});

// POST /booking (public)
app.post("/booking", async (req, res) => {
  try {
    const { serviceId, customerName, date, contactMethod, email, phone, timeSlot } = req.body;
    
    // Basic validation
    if (!serviceId || !customerName || !date || !contactMethod || !timeSlot) {
      return res.render("booking", { 
        serviceId, 
        service: await Service.findById(serviceId),
        error: "All fields are required, including contact method and time slot!" 
      });
    }

    // Conditional contact validation
    let validationError = "";
    if (contactMethod === 'email') {
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        validationError = "Please enter a valid email address.";
      }
    } else if (contactMethod === 'phone') {
      if (!phone || !/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(phone)) {
        validationError = "Please enter a valid Indian phone number (10 digits, starting with 6-9).";
      }
    }

    if (validationError) {
      return res.render("booking", { 
        serviceId, 
        service: await Service.findById(serviceId),
        error: validationError,
        customerName,
        date,
        contactMethod,
        email: contactMethod === 'email' ? email : "",
        phone: contactMethod === 'phone' ? phone : "",
        timeSlot
      });
    }

    // Save booking
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

    // Fetch full service for confirmation
    const service = await Service.findById(serviceId);
    const fullBooking = { 
      ...booking.toObject(), 
      service: service 
    };

    console.log("✅ Booking confirmed");
    res.render("confirmation", { booking: fullBooking });
  } catch (err) {
    console.error("Booking save error:", err);
    res.render("booking", { 
      serviceId: req.body.serviceId, 
      service: await Service.findById(req.body.serviceId),
      error: "Booking failed. Please try again."
    });
  }
});

// Bookings List (public - all bookings)
app.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().populate("service");
    // Debug log for null services
    bookings.forEach((booking, index) => {
      if (!booking.service) {
        console.warn(`⚠️ Booking ${booking._id}: Service is null (ID: ${booking.service}). Possible orphan.`);
      }
    });
    console.log(`📋 Loaded ${bookings.length} bookings`);
    res.render("bookings", { bookings });
  } catch (err) {
    console.error("Bookings fetch error:", err);
    res.status(500).send("Error loading bookings");
  }
});

// Mount API Routes (public)
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/services", require("./routes/services"));

// Start server
app.listen(port, () => console.log(`🚀 Server running: http://localhost:${port}`));
