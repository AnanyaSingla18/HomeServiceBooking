require('dotenv').config();
const { Sequelize } = require('sequelize');

// Prefer PG connection URL via DATABASE_URL, else fall back
const databaseUrl = process.env.DATABASE_URL || process.env.PG_URI || '';

// If not provided, assemble from components
let sequelize;
if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, { dialect: 'postgres', logging: false });
} else {
  const dbHost = process.env.PG_HOST || 'localhost';
  const dbPort = process.env.PG_PORT || 5432;
  const dbName = process.env.PG_DATABASE || 'homeServiceDB';
  const dbUser = process.env.PG_USER || 'postgres';
  const dbPassword = process.env.PG_PASSWORD || '2310990108';
  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: false
  });
}

module.exports = sequelize;
