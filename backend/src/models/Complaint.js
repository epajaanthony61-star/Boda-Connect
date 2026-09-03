const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Complaint = sequelize.define('Complaint', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Rides',
      key: 'id'
    }
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Customers',
      key: 'id'
    }
  },
  riderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Riders',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.ENUM(
      'rude_behavior',
      'overcharging',
      'unsafe_driving',
      'wrong_route',
      'vehicle_condition',
      'sexual_harassment',
      'theft',
      'other'
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  evidenceImages: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  evidenceAudio: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'escalated', 'dismissed'),
    defaultValue: 'pending',
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
    allowNull: false
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  customerSatisfaction: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['rideId'] },
    { fields: ['customerId'] },
    { fields: ['riderId'] },
    { fields: ['status'] },
    { fields: ['category'] }
  ]
});

module.exports = Complaint;
