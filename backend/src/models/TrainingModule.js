const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrainingModule = sequelize.define('TrainingModule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  riderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Riders',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'safety',
      'customer_service',
      'attitude',
      'defensive_driving',
      'vehicle_maintenance',
      'code_of_conduct',
      'emergency_response'
    ),
    allowNull: false
  },
  contentType: {
    type: DataTypes.ENUM('video', 'text', 'quiz', 'interactive'),
    allowNull: false
  },
  contentUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contentData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isMandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  quizScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  assignedReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['riderId'] },
    { fields: ['category'] },
    { fields: ['isCompleted'] },
    { fields: ['isMandatory'] }
  ]
});

module.exports = TrainingModule;
