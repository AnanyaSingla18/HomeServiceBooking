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

const app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/homeServiceDB')
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

    res.render('booking', {
      service,
      serviceId: serviceId || '',
      error: null,
      customerName: '',
      date: '',
      contactMethod: '',
      email: '',
      phone: '',
      timeSlot: ''
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
      timeSlot: ''
    });
  }
});

app.post('/booking', async (req, res) => {
  try {
    const { serviceId, customerName, date, contactMethod, email, phone, timeSlot } = req.body;

    if (!serviceId || !serviceId.trim()) {
      return res.render('booking', { service: null, serviceId: '', error: 'Service ID required', customerName, date, contactMethod, email, phone, timeSlot });
    }

    if (!customerName || !date || !contactMethod || !timeSlot) {
      const service = await Service.findById(serviceId);
      return res.render('booking', { service, serviceId, error: 'Missing required fields', customerName, date, contactMethod, email, phone, timeSlot });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.render('booking', { service: null, serviceId, error: 'Service not found', customerName, date, contactMethod, email, phone, timeSlot });
    }

    if (contactMethod === 'email' && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return res.render('booking', { service, serviceId, error: 'Invalid email', customerName, date, contactMethod, email, phone, timeSlot });
    }

    if (contactMethod === 'phone' && (!phone || !/^[0-9]{10}$/.test(phone))) {
      return res.render('booking', { service, serviceId, error: 'Invalid phone', customerName, date, contactMethod, email, phone, timeSlot });
    }

    const bookingPayload = process.env.DB_TYPE === 'postgres' ? {
      serviceId,
      customerName,
      date: new Date(date),
      contactMethod,
      email: contactMethod === 'email' ? email : undefined,
      phone: contactMethod === 'phone' ? phone : undefined,
      timeSlot
    } : {
      service: serviceId,
      customerName,
      date: new Date(date),
      contactMethod,
      email: contactMethod === 'email' ? email : undefined,
      phone: contactMethod === 'phone' ? phone : undefined,
      timeSlot
    };

    const booking = await Booking.create(bookingPayload);
    const populated = process.env.DB_TYPE === 'postgres'
      ? await Booking.findById(booking._id || booking.id)
      : await Booking.findById(booking._id).populate('service').populate('approvedBy');

    res.render('confirmation', { booking: populated });
  } catch (err) {
    res.render('booking', {
      service: null,
      serviceId: '',
      error: 'Booking failed. Try again.',
      customerName: '',
      date: '',
      contactMethod: '',
      email: '',
      phone: '',
      timeSlot: ''
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));