const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Booking = require("./models/Booking");
const Service = require("./models/Service");
const User = require("./models/User");  // NEW: User model
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

// NEW: Session Middleware (secure cookies)
app.use(session({
  secret: 'your-secret-key-change-in-prod',  // Change to env var
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,  // true in HTTPS/prod
    httpOnly: true,  // Prevent JS access
    maxAge: 1000 * 60 * 60 * 24  // 1 day
  }
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// NEW: Auth Middleware - Protect routes
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();  // Logged in
  }
  res.redirect('/login?error=Please log in to access this page.');  // Redirect to login
};

// NEW: Auth Routes (Signup/Login/Logout)
app.get('/signup', (req, res) => {
  res.render('signup', { error: null, name: '', email: '', password: '' });
});

app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.render('signup', { 
        error: 'All fields are required!', 
        name, email, password 
      });
    }
    if (password.length < 6) {
      return res.render('signup', { 
        error: 'Password must be at least 6 characters!', 
        name, email, password 
      });
    }

    // Check if user exists
    const existingUser  = await User.findOne({ email });
    if (existingUser ) {
      return res.render('signup', { 
        error: 'User  with this email already exists!', 
        name, email, password 
      });
    }

    // Create user (hash auto via pre-save)
    const user = new User({ name, email, password });
    await user.save();

    // Start session
    req.session.userId = user._id;
    req.session.userName = user.name;

    console.log(`✅ New user signed up: ${user.name}`);
    res.redirect('/services');  // Redirect to services after signup
  } catch (err) {
    console.error('Signup error:', err);
    res.render('signup', { 
      error: 'Signup failed. Please try again.', 
      name: req.body.name, 
      email: req.body.email, 
      password: ''  // Don't repopulate password
    });
  }
});

app.get('/login', (req, res) => {
  const error = req.query.error || null;
  res.render('login', { error, email: '', password: '' });
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('login', { 
        error: 'Email and password are required!', 
        email, password 
      });
    }

    // Find user (select password)
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.render('login', { 
        error: 'Invalid email or password!', 
        email, password: '' 
      });
    }

    // Start session
    req.session.userId = user._id;
    req.session.userName = user.name;

    console.log(`✅ User logged in: ${user.name}`);
    res.redirect('/services');  // Or /bookings if preferred
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { 
      error: 'Login failed. Please try again.', 
      email: req.body.email, 
      password: '' 
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    console.log('👋 User logged out');
    res.redirect('/');
  });
});

// Home route (show login/signup if not auth)
app.get("/", (req, res) => {
  if (req.session.userId) {
    res.redirect('/services');  // Logged in → Services
  } else {
    res.render("index", { user: null });  // Update index.ejs to show login links
  }
});

// Services route (public)
app.get("/services", async (req, res) => {
  try {
    const services = await Service.find();
    res.render("services", { services, user: req.session.userName || null });
  } catch (err) {
    console.error("Services fetch error:", err);
    res.status(500).send("Error loading services");
  }
});

// NEW: Protected Booking Form
app.get("/booking", isAuthenticated, async (req, res) => {
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
      customerName: req.session.userName || '',  // Pre-fill with user name
      date: "",
      contactMethod: "",
      email: "",
      phone: "",
      timeSlot: "",
      user: req.session.userName
    });
  } catch (err) {
    console.error("Booking form error:", err);
    res.status(500).send("Error loading form");
  }
});

// Protected POST /booking (add user ref)
app.post("/booking", isAuthenticated, async (req, res) => {
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
        timeSlot,
        user: req.session.userName
      });
    }

    // Save booking (add user ref)
    const booking = new Booking({ 
      service: serviceId, 
      customerName, 
      date: new Date(date), 
      contactMethod,
      email: contactMethod === 'email' ? email : undefined,
      phone: contactMethod === 'phone' ? phone : undefined,
      timeSlot,
      user: req.session.userId  // NEW: Link to user
    });
    await booking.save();

    // Fetch full service for confirmation
    const service = await Service.findById(serviceId);
    const fullBooking = { 
      ...booking.toObject(), 
      service: service 
    };

    console.log("✅ Booking confirmed for user:", req.session.userName);
    res.render("confirmation", { booking: fullBooking, user: req.session.userName });
  } catch (err) {
    console.error("Booking save error:", err);
    res.render("booking", { 
      serviceId: req.body.serviceId, 
      service: await Service.findById(req.body.serviceId),
      error: "Booking failed. Please try again.",
      user: req.session.userName
    });
  }
});

// NEW: Protected Bookings List (filter by user)
app.get("/bookings", isAuthenticated, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.session.userId }).populate("service");
    // Debug log for null services
    bookings.forEach((booking, index) => {
      if (!booking.service) {
        console.warn(`⚠️ Booking ${booking._id}: Service is null (ID: ${booking.service}). Possible orphan.`);
      }
    });
    console.log(`📋 Loaded ${bookings.length} bookings for ${req.session.userName}`);
    res.render("bookings", { bookings, user: req.session.userName });
  } catch (err) {
    console.error("Bookings fetch error:", err);
    res.status(500).send("Error loading bookings");
  }
});

// Mount API Routes (NEW: Protect with session check for web-like auth)
app.use("/api/bookings", (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized - Please log in" });
  }
  next();
}, require("./routes/bookings"));

app.use("/api/services", require("./routes/services"));  // Public

// Start server
app.listen(port, () => console.log(`🚀 Server running: http://localhost:${port}`));
