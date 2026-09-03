const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
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
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  agentCommission: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  platformFee: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  riderEarnings: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('mobile_money', 'card', 'cash', 'wallet'),
    allowNull: false
  },
  paymentProvider: {
    type: DataTypes.ENUM('mtn_momo', 'airtel_money', 'stripe', 'paystack', 'flutterwave', 'cash'),
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  providerResponse: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['rideId'] },
    { fields: ['customerId'] },
    { fields: ['riderId'] },
    { fields: ['status'] },
    { fields: ['transactionId'] }
  ]
});

module.exports = Payment;
