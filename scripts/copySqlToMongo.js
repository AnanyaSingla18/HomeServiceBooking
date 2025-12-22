#!/usr/bin/env node
require('dotenv').config();

const mongoose = require('mongoose');
const sqlModels = require('../models_sql');
const MongoUser = require('../models/User');
const MongoBooking = require('../models/booking');
const MongoService = require('../models/service');

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/homeService';
  console.log('Connecting to Mongo:', mongoUri);
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log('Connecting to Postgres (Sequelize)');
  await sqlModels.sequelize.authenticate();

  // Fetch SQL data
  const sqlUsers = await sqlModels.User.findAll({ raw: true });
  const sqlServices = await sqlModels.Service.findAll({ raw: true });
  const sqlBookings = await sqlModels.Booking.findAll({ raw: true });

  // Map SQL user id -> Mongo _id
  const userIdMap = {};

  console.log(`Found ${sqlUsers.length} SQL users. Syncing to Mongo...`);
  for (const u of sqlUsers) {
    const email = (u.email || '').toLowerCase();
    const doc = await MongoUser.findOne({ email }).exec();
    if (doc) {
      userIdMap[u.id] = doc._id;
      continue;
    }
    // Insert directly into collection to avoid mongoose pre-save hashing
    const insert = {
      name: u.name || 'Unknown',
      email,
      password: u.password || '',
      role: u.role || 'user',
      createdAt: u.createdAt || new Date(),
      updatedAt: u.updatedAt || new Date()
    };
    const res = await MongoUser.collection.insertOne(insert);
    userIdMap[u.id] = res.insertedId;
    console.log(`Created Mongo user: ${email}`);
  }

  // Map services: match by name
  const mongoServices = await MongoService.find().lean().exec();
  const serviceMap = {}; // sqlServiceId -> mongoObjectId
  for (const s of sqlServices) {
    const match = mongoServices.find(ms => ms.name && ms.name.toLowerCase() === (s.name || '').toLowerCase());
    if (match) serviceMap[s.id] = match._id;
  }

  console.log(`Found ${sqlBookings.length} SQL bookings. Syncing to Mongo...`);
  for (const b of sqlBookings) {
    // Prevent duplicates: check by unique fields (date + customerName + serviceId)
    const existing = await MongoBooking.findOne({ customerName: b.customerName, date: b.date }).exec();
    if (existing) continue;

    const mongoBooking = {
      service: serviceMap[b.serviceId] || null,
      customerName: b.customerName,
      date: b.date,
      contactMethod: b.contactMethod,
      email: b.email,
      phone: b.phone,
      timeSlot: b.timeSlot,
      status: b.status || 'pending',
      approvedBy: b.approvedById ? (userIdMap[b.approvedById] || null) : null,
      approvedAt: b.approvedAt || null,
      createdAt: b.createdAt || new Date(),
      updatedAt: b.updatedAt || new Date()
    };
    await MongoBooking.collection.insertOne(mongoBooking);
    console.log(`Inserted booking for ${b.customerName} on ${b.date}`);
  }

  console.log('Sync complete. Closing connections.');
  await sqlModels.sequelize.close();
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Error during copy:', err);
  process.exit(1);
});
