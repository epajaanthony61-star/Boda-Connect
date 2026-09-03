const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Agent = sequelize.define('Agent', {
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
  stageId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Stages',
      key: 'id'
    }
  },
  agentCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  commissionRate: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0, // percentage
    allowNull: false
  },
  totalRidesDispatched: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalCommissionEarned: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['stageId'] },
    { fields: ['agentCode'] }
  ]
});

module.exports = Agent;
