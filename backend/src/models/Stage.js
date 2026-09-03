const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Stage = sequelize.define('Stage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  location: {
    type: DataTypes.GEOGRAPHY('POINT'),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  region: {
    type: DataTypes.STRING,
    allowNull: false
  },
  baseFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1000 // Base fare in local currency
  },
  ratePerKm: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 500 // Rate per kilometer
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  managerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  operatingHours: {
    type: DataTypes.JSONB,
    defaultValue: {
      start: '06:00',
      end: '22:00'
    }
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['code'] },
    { fields: ['city'] },
    { fields: ['region'] },
    { fields: ['isActive'] }
  ]
});

// Method to calculate fare based on distance
Stage.prototype.calculateFare = function(distanceInKm) {
  const baseFare = this.baseFare;
  const distanceFare = distanceInKm * this.ratePerKm;
  return baseFare + distanceFare;
};

// Static method to get stages near a location
Stage.getStagesNearLocation = async function(latitude, longitude, radiusInKm = 5) {
  const query = `
    SELECT *, 
      ST_DistanceSphere(location, ST_MakePoint($2, $3)) as distance
    FROM "Stages"
    WHERE ST_DWithin(location::geography, ST_MakePoint($2, $3)::geography, $1 * 1000)
    AND "isActive" = true
    ORDER BY distance
  `;
  const results = await sequelize.query(query, {
    model: Stage,
    replacements: [radiusInKm, longitude, latitude]
  });
  return results;
};

module.exports = Stage;
