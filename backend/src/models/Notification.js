const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'ride_request',
      'ride_accepted',
      'ride_arriving',
      'ride_started',
      'ride_completed',
      'ride_cancelled',
      'payment_received',
      'rating_received',
      'complaint_filed',
      'complaint_resolved',
      'tier_promoted',
      'tier_demoted',
      'suspension_warning',
      'suspension_notice',
      'training_assigned',
      'training_reminder',
      'system_announcement',
      'sos_alert'
    ),
    allowNull: false
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actionUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  sentVia: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: ['in_app'] // Can include: 'push', 'sms', 'email'
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['type'] },
    { fields: ['isRead'] },
    { fields: ['priority'] }
  ]
});

module.exports = Notification;
