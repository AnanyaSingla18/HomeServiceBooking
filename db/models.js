// Helper to expose both Mongo (Mongoose) and SQL (Sequelize) model sets
// Usage: const { mongo, sql, get } = require('../db/models');
//        const Service = get('Service','mongo');

const mongo = require('../models');
let sql;
try {
  sql = require('../models_sql');
} catch (err) {
  sql = null;
}

function get(name, which = process.env.DEFAULT_DB || 'mongo') {
  if (which === 'sql') {
    if (!sql) throw new Error('SQL models not available');
    // prefer raw SQL models (not compat) when direct sequelize usage desired
    const map = { User: sql.User, Service: sql.Service, Booking: sql.Booking };
    return map[name];
  }
  // default mongo
  return mongo[name];
}

module.exports = { mongo, sql, get };
