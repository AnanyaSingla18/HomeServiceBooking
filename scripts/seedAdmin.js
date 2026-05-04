require('dotenv').config();

const doSeed = async () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'ananya@gmail.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || '2310990108';

  const mongoUri = process.env.MONGO_URI;
  const useMongo = !!mongoUri;
  const useSql = !!(process.env.DATABASE_URL || process.env.PG_HOST || process.env.PG_URI || process.env.DB_TYPE === 'postgres');

  let mongoose;
  let UserMongo;
  if (useMongo) {
    mongoose = require('mongoose');
    UserMongo = require('../models/User');
  }

  let sqlModels;
  if (useSql) {
    sqlModels = require('../models_sql');
  }

  try {
    // Connect Mongo if configured
    if (useMongo) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log('Mongo connected');

      let mUser = await UserMongo.findOne({ email: adminEmail });
      if (mUser) {
        if (mUser.role !== 'admin') {
          mUser.role = 'admin';
          await mUser.save();
          console.log(`Updated existing Mongo user to admin: ${adminEmail}`);
        } else {
          console.log(`Mongo admin already exists: ${adminEmail}`);
        }
      } else {
        mUser = new UserMongo({ name: 'Administrator', email: adminEmail, password: adminPassword, role: 'admin' });
        await mUser.save();
        console.log(`Created admin user in Mongo: ${adminEmail} / ${adminPassword}`);
      }
    }

    // Connect / sync SQL if configured
    if (useSql) {
      console.log('Connecting to Postgres (Sequelize)...');
      await sqlModels.sequelize.authenticate();
      // ensure tables exist
      await sqlModels.sync({ force: false });
      console.log('Postgres connected and synced');

      const { User } = sqlModels;
      let sUser = await User.findOne({ where: { email: adminEmail } });
      if (sUser) {
        if (sUser.role !== 'admin') {
          sUser.role = 'admin';
          await sUser.save();
          console.log(`Updated existing SQL user to admin: ${adminEmail}`);
        } else {
          console.log(`SQL admin already exists: ${adminEmail}`);
        }
      } else {
        await User.create({ name: 'Administrator', email: adminEmail, password: adminPassword, role: 'admin' });
        console.log(`Created admin user in Postgres: ${adminEmail} / ${adminPassword}`);
      }
    }

    console.log('Admin seeding complete.');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    if (useMongo && mongoose) {
      try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
    }
    process.exit(0);
  }
};

doSeed();