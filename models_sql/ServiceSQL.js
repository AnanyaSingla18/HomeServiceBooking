const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/sequelize');

class Service extends Model {}

Service.init({
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  price: { type: DataTypes.FLOAT, allowNull: false }
}, { sequelize, modelName: 'Service' });

module.exports = Service;
