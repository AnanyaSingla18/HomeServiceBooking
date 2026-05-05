require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const dbType = process.env.DB_TYPE || 'mongo';
const models = dbType === 'postgres' ? require('./models_sql').compat : require('./models');
const User = models.User;
const Service = models.Service;
const Booking = models.Booking;

const serviceProviderMap = [
  {
    matcher: /plumb/i,
    providers: [
      { name: 'Aarav Kumar', phone: '9876543210', note: 'Senior plumbing technician' },
      { name: 'Neha Singh', phone: '9123456780', note: 'Pipe and leak specialist' }
    ]
  },
  {
    matcher: /electric|electrical/i,
    providers: [
      { name: 'Rohan Verma', phone: '9988776655', note: 'Licensed electrician' },
      { name: 'Priya Shah', phone: '9012345678', note: 'Fixture and wiring expert' }
    ]
  },
  {
    matcher: /clean/i,
    providers: [
      { name: 'Sana Patel', phone: '9876501234', note: 'Home cleaning specialist' },
      { name: 'Vikram Joshi', phone: '9765432109', note: 'Deep clean expert' }
    ]
  },
  {
    matcher: /ac|cooling/i,
    providers: [
      { name: 'Kabir Singh', phone: '9988001122', note: 'AC service technician' },
      { name: 'Maya Nair', phone: '9445566778', note: 'Cooling system expert' }
    ]
  }
];

function getProvidersForService(name = '') {
  const label = name.toString().toLowerCase();
  const match = serviceProviderMap.find(item => item.matcher.test(label));
  return match ? match.providers : [
    { name: 'Nisha Patel', phone: '7012345678', note: 'Certified home service partner' },
    { name: 'Rohan Mehta', phone: '7890123456', note: 'Local service coordinator' }
  ];
}

function enrichService(service) {
  if (!service) return service;
  const plain = service.toJSON ? service.toJSON() : { ...service };
  plain.providers = getProvidersForService(plain.name);
  return plain;
}

const app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/homeService')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const hasPgConfig = !!(process.env.DATABASE_URL || process.env.PG_HOST || process.env.PG_URI || process.env.PG_DATABASE);
if (hasPgConfig) {
  try {
    const sqlModels = require('./models_sql');
    sqlModels.sequelize.authenticate()
      .then(() => console.log('Postgres (Sequelize) connected'))
      .catch(err => console.error('Postgres connect error:', err));
    if (process.env.PG_SYNC === 'true') {
      sqlModels.sync({ force: false })
        .then(() => console.log('Postgres tables synced'))
        .catch(err => console.error('Postgres sync error:', err));
    }
  } catch (err) {
    console.warn('Postgres not setup:', err.message);
  }
}

app.use(async (req, res, next) => {
  res.locals.user = null;
  try {
    const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_this_secret');
      const dbType = process.env.DB_TYPE || 'mongo';
      const models = dbType === 'postgres' ? require('./models_sql').compat : require('./models');
      const UserModel = models.User;
      let user = await UserModel.findById(payload.id);
      if (user && user.toJSON) user = user.toJSON();
      if (user) res.locals.user = user;
    }
  } catch {}
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/services', require('./routes/services'));
app.use('/admin', require('./routes/admin'));

app.get('/', async (req, res) => {
  try {
    let services;
    if (process.env.DB_TYPE === 'postgres') {
      services = await Service.find();
      services.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      services = await Service.find().sort({ createdAt: -1 });
    }
    services = services.map(enrichService);
    res.render('index', { services });
  } catch (err) {
    res.render('index', { services: [] });
  }
});

app.get('/services', async (req, res) => {
  try {
    let services = await Service.find();
    if (process.env.DB_TYPE === 'postgres') {
      services.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    services = services.map(enrichService);
    res.render('services', { services });
  } catch (err) {
    res.render('services', { services: [] });
  }
});

app.get('/bookings', async (req, res) => {
  try {
    let bookings;
    if (process.env.DB_TYPE === 'postgres') {
      bookings = await Booking.find();
    } else {
      bookings = await Booking.find().populate('service').sort({ createdAt: -1 });
    }
    res.render('bookings', { bookings });
  } catch {
    res.render('bookings', { bookings: [] });
  }
});

app.get('/booking', async (req, res) => {
  try {
    const serviceId = req.query.serviceId;
    let service = null;

    if (process.env.DB_TYPE === 'postgres') {
      service = await Service.findById(serviceId);
    } else {
      if (serviceId && serviceId.trim().length === 24) {
        service = await Service.findById(serviceId);
      }
    }

    if (service) service = enrichService(service);

    res.render('booking', {
      service,
      serviceId: serviceId || '',
      error: null,
      customerName: '',
      date: '',
      contactMethod: '',
      email: '',
      phone: '',
      timeSlot: '',
      paymentMethod: 'cash',
      upiId: ''
    });
  } catch (err) {
    res.render('booking', {
      service: null,
      serviceId: '',
      error: 'Error loading service',
      customerName: '',
      date: '',
      contactMethod: '',
      email: '',
      phone: '',
      timeSlot: '',
      paymentMethod: 'cash',
      upiId: ''
    });
  }
});

app.post('/booking', async (req, res) => {
  try {
    const { serviceId, customerName, date, contactMethod, email, phone, timeSlot } = req.body;

    if (!serviceId || !serviceId.trim()) {
      return res.render('booking', { service: null, serviceId: '', error: 'Service ID required', customerName, date, contactMethod, email, phone, timeSlot, paymentMethod: 'cash', upiId: '' });
    }

    if (!customerName || !date || !contactMethod || !timeSlot) {
      const service = await Service.findById(serviceId);
      return res.render('booking', { service, serviceId, error: 'Missing required fields', customerName, date, contactMethod, email, phone, timeSlot, paymentMethod: req.body?.paymentMethod || 'cash', upiId: req.body?.upiId || '' });
    }

    let service = await Service.findById(serviceId);
    if (service) service = enrichService(service);
    if (!service) {
      return res.render('booking', { service: null, serviceId, error: 'Service not found', customerName, date, contactMethod, email, phone, timeSlot, paymentMethod: req.body?.paymentMethod || 'cash', upiId: req.body?.upiId || '' });
    }

    if (contactMethod === 'email' && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return res.render('booking', { service, serviceId, error: 'Invalid email', customerName, date, contactMethod, email, phone, timeSlot, paymentMethod: req.body?.paymentMethod || 'cash', upiId: req.body?.upiId || '' });
    }

    if (contactMethod === 'phone' && (!phone || !/^[0-9]{10}$/.test(phone))) {
      return res.render('booking', { service, serviceId, error: 'Invalid phone', customerName, date, contactMethod, email, phone, timeSlot, paymentMethod: req.body?.paymentMethod || 'cash', upiId: req.body?.upiId || '' });
    }

    // Prepare payloads for both databases
    const mongoPayload = {
      service: serviceId,
      customerName,
      date: new Date(date),
      contactMethod,
      email: contactMethod === 'email' ? email : undefined,
      phone: contactMethod === 'phone' ? phone : undefined,
      timeSlot
    };

    // For PostgreSQL, find the service by name to get the SQL serviceId
    let sqlServiceId = null;
    try {
      const sqlModels = require('./models_sql');
      const sqlService = await sqlModels.Service.findOne({ where: { name: service.name } });
      if (sqlService) {
        sqlServiceId = sqlService.id;
      }
    } catch (err) {
      console.error('Error finding SQL service:', err);
    }

    const sqlPayload = {
      serviceId: sqlServiceId,
      customerName,
      date: new Date(date),
      contactMethod,
      amount: service.price,
      email: contactMethod === 'email' ? email : undefined,
      phone: contactMethod === 'phone' ? phone : undefined,
      timeSlot
    };

    // Save to both databases
    let mongoBooking = null;
    let sqlBooking = null;

    try {
      // Save to MongoDB
      const MongoBooking = require('./models/booking');
      mongoBooking = await MongoBooking.create(mongoPayload);
    } catch (mongoErr) {
      console.error('MongoDB save error:', mongoErr);
    }

    try {
      // Save to PostgreSQL
      const sqlModels = require('./models_sql');
      sqlBooking = await sqlModels.Booking.create(sqlPayload);
    } catch (sqlErr) {
      console.error('PostgreSQL save error:', sqlErr);
    }

    // Use the booking from the primary DB for response
    const primaryBooking = process.env.DB_TYPE === 'postgres' ? sqlBooking : mongoBooking;
    if (!primaryBooking) {
      throw new Error('Failed to save booking to any database');
    }

    const populated = process.env.DB_TYPE === 'postgres'
      ? await Booking.findById(primaryBooking._id || primaryBooking.id)
      : await Booking.findById(primaryBooking._id).populate('service').populate('approvedBy');

    if (populated && populated.service) {
      populated.service = enrichService(populated.service);
    }

    res.render('confirmation', { booking: populated });
  } catch (err) {
    console.error('Booking submission failed:', err);
    let service = null;
    let serviceId = '';
    if (req.body && req.body.serviceId) {
      serviceId = req.body.serviceId;
      try {
        service = await Service.findById(serviceId);
        if (service) service = enrichService(service);
      } catch (lookupErr) {
        console.error('Booking service lookup failed:', lookupErr);
      }
    }

    res.render('booking', {
      service,
      serviceId,
      error: `Booking failed. Try again.${err.message ? ' (' + err.message + ')' : ''}`,
      customerName: req.body?.customerName || '',
      date: req.body?.date || '',
      contactMethod: req.body?.contactMethod || '',
      email: req.body?.email || '',
      phone: req.body?.phone || '',
      timeSlot: req.body?.timeSlot || '',
      paymentMethod: req.body?.paymentMethod || 'cash',
      upiId: req.body?.upiId || ''
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
