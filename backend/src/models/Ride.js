const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ride = sequelize.define('Ride', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rideCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
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
    allowNull: true,
    references: {
      model: 'Riders',
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
  pickupLocation: {
    type: DataTypes.GEOGRAPHY('POINT'),
    allowNull: false
  },
  pickupAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  dropoffLocation: {
    type: DataTypes.GEOGRAPHY('POINT'),
    allowNull: false
  },
  dropoffAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  distanceInKm: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  estimatedDuration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: false
  },
  baseFare: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  totalFare: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  agentCommission: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  status: {
    type: DataTypes.ENUM(
      'requested',
      'searching',
      'accepted',
      'arriving',
      'in_progress',
      'completed',
      'cancelled',
      'disputed'
    ),
    defaultValue: 'requested',
    allowNull: false
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  arrivedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelledBy: {
    type: DataTypes.ENUM('customer', 'rider', 'system'),
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.ENUM('mobile_money', 'card', 'cash', 'wallet'),
    allowNull: true
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  routeData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  trackingData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  safetyChecklistCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  helmetVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['rideCode'] },
    { fields: ['customerId'] },
    { fields: ['riderId'] },
    { fields: ['stageId'] },
    { fields: ['status'] },
    { fields: ['paymentStatus'] }
  ]
});

// Generate unique ride code
Ride.generateRideCode = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BD-${timestamp}-${random}`;
};

// Before create hook to generate ride code
Ride.addHook('beforeCreate', (ride) => {
  ride.rideCode = Ride.generateRideCode();
});

module.exports = Ride;
