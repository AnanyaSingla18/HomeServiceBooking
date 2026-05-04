const sequelize = require('../db/sequelize');
const User = require('./UserSQL');
const Service = require('./ServiceSQL');
const Booking = require('./BookingSQL');

async function sync(options = { force: false }) {
  await sequelize.authenticate();
  await sequelize.sync(options);
}
module.exports = { sequelize, User, Service, Booking, sync };
// Provide a small compatibility layer for the existing Mongoose-style usage
module.exports.compat = {
  User: {
    findOne: async (query) => {
      return User.findOne({ where: query });
    },
    findById: async (id) => {
      return User.findByPk(id);
    },
    create: async (obj) => User.create(obj),
    // mimic mongoose .select('+password') by simply returning +password (all included by default)
  },
  Service: {
    find: async () => (await Service.findAll()).map(s => s.toJSON()),
    findById: async (id) => {
      const s = await Service.findByPk(id);
      return s ? s.toJSON() : null;
    },
    create: async (obj) => Service.create(obj),
    deleteMany: async () => Service.destroy({ where: {} }),
    insertMany: async (arr) => Service.bulkCreate(arr)
  },
  Booking: {
    find: async () => (await Booking.findAll({ include: [Service, { model: User, as: 'approvedBy' }], order: [['createdAt', 'DESC']] })).map(b => b.toJSON()),
    findById: async (id) => {
      const b = await Booking.findByPk(id, { include: [Service, { model: User, as: 'approvedBy' }] });
      return b ? b.toJSON() : null;
    },
    create: async (obj) => Booking.create(obj)
  }
};
