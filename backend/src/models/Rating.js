const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rating = sequelize.define('Rating', {
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
  overallRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  punctualityRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  safetyRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  attitudeRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  cleanlinessRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  drivingSkillRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  isFlagged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  flagReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['rideId'] },
    { fields: ['customerId'] },
    { fields: ['riderId'] },
    { fields: ['overallRating'] }
  ]
});

// Calculate average ratings for a rider
Rating.calculateRiderAverages = async function(riderId) {
  const result = await this.findOne({
    where: { riderId },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('overallRating')), 'averageOverall'],
      [sequelize.fn('AVG', sequelize.col('attitudeRating')), 'averageAttitude'],
      [sequelize.fn('AVG', sequelize.col('safetyRating')), 'averageSafety'],
      [sequelize.fn('AVG', sequelize.col('punctualityRating')), 'averagePunctuality'],
      [sequelize.fn('AVG', sequelize.col('cleanlinessRating')), 'averageCleanliness'],
      [sequelize.fn('AVG', sequelize.col('drivingSkillRating')), 'averageDrivingSkill'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalRatings']
    ]
  });
  
  return result ? result.dataValues : null;
};

module.exports = Rating;
