// const { DataTypes, Model } = require('sequelize');
// const sequelize = require('../db/sequelize');
// const Service = require('./ServiceSQL');
// const User = require('./UserSQL');

// class Booking extends Model {}

// Booking.init({
//   customerName: { type: DataTypes.STRING, allowNull: false },
//   date: { type: DataTypes.DATE, allowNull: false },
//   contactMethod: { type: DataTypes.ENUM('email', 'phone'), allowNull: false },
//   email: { type: DataTypes.STRING },
//   phone: { type: DataTypes.STRING },
//   timeSlot: { type: DataTypes.STRING, allowNull: false },
//   status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
//   approvedAt: { type: DataTypes.DATE }
// }, { sequelize, modelName: 'Booking' });

// Booking.belongsTo(Service, { foreignKey: 'serviceId' });
// Booking.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });
// Service.hasMany(Booking, { foreignKey: 'serviceId' });
// User.hasMany(Booking, { foreignKey: 'approvedById', as: 'approvals' });

// module.exports = Booking;


const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/sequelize');
const Service = require('./ServiceSQL');
const User = require('./UserSQL');

class Booking extends Model {}

Booking.init({
  customerName: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATE, allowNull: false },
  contactMethod: { type: DataTypes.ENUM('email', 'phone'), allowNull: false },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  timeSlot: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },

  // 🔥 REQUIRED FIELDS (MISSING BEFORE)
  serviceId: { type: DataTypes.INTEGER, allowNull: false },
  approvedById: { type: DataTypes.INTEGER, allowNull: true },
  approvedAt: { type: DataTypes.DATE, allowNull: true }

}, { sequelize, modelName: 'Booking' });

// Associations
Booking.belongsTo(Service, { foreignKey: 'serviceId' });
Booking.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });

Service.hasMany(Booking, { foreignKey: 'serviceId' });
User.hasMany(Booking, { foreignKey: 'approvedById', as: 'approvals' });

module.exports = Booking;
