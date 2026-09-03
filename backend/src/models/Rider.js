const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rider = sequelize.define('Rider', {
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
    allowNull: true,
    references: {
      model: 'Stages',
      key: 'id'
    }
  },
  nationalIdNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  nationalIdImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  licenseExpiryDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  licenseImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehicleRegistrationNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  vehicleInsuranceExpiryDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  vehicleRegistrationImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehicleInsuranceImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  bodaClass: {
    type: DataTypes.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'),
    defaultValue: 'Bronze',
    allowNull: false
  },
  totalTrips: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  averageRating: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  attitudeScore: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isSuspended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  suspensionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  suspensionUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  currentLocation: {
    type: DataTypes.GEOGRAPHY('POINT'),
    allowNull: true
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastActiveAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  trainingCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  warningsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['stageId'] },
    { fields: ['bodaClass'] },
    { fields: ['isVerified'] },
    { fields: ['isAvailable'] }
  ]
});

// Static method to calculate tier based on ratings and trips
Rider.calculateTier = function(averageRating, totalTrips, attitudeScore) {
  if (averageRating >= 4.8 && totalTrips >= 500 && attitudeScore >= 4.5) {
    return 'Platinum';
  } else if (averageRating >= 4.5 && totalTrips >= 200 && attitudeScore >= 4.0) {
    return 'Gold';
  } else if (averageRating >= 4.0 && totalTrips >= 50 && attitudeScore >= 3.5) {
    return 'Silver';
  }
  return 'Bronze';
};

// Instance method to update tier
Rider.prototype.updateTier = async function() {
  const newTier = Rider.calculateTier(this.averageRating, this.totalTrips, this.attitudeScore);
  if (newTier !== this.bodaClass) {
    await this.update({ bodaClass: newTier });
    return true;
  }
  return false;
};

// Check if rider should be suspended based on attitude score
Rider.prototype.checkSuspension = async function() {
  if (this.attitudeScore < 2.0 && this.totalTrips >= 10) {
    await this.update({
      isSuspended: true,
      suspensionReason: 'Low attitude score - mandatory retraining required',
      suspensionUntil: null // Until training completed
    });
    return true;
  }
  return false;
};

module.exports = Rider;
