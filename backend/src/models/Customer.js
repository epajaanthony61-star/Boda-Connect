const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  totalRides: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  favoriteStages: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: []
  },
  savedAddresses: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  emergencyContact: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] }
  ]
});

module.exports = Customer;
