const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Rider = require('./Rider');
const Customer = require('./Customer');
const Agent = require('./Agent');
const Stage = require('./Stage');
const Ride = require('./Ride');
const Rating = require('./Rating');
const Complaint = require('./Complaint');
const Payment = require('./Payment');
const TrainingModule = require('./TrainingModule');
const Notification = require('./Notification');

// Define associations
User.hasOne(Rider, { foreignKey: 'userId', as: 'riderProfile' });
Rider.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Customer, { foreignKey: 'userId', as: 'customerProfile' });
Customer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Agent, { foreignKey: 'userId', as: 'agentProfile' });
Agent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Stage.hasMany(Agent, { foreignKey: 'stageId', as: 'agents' });
Agent.belongsTo(Stage, { foreignKey: 'stageId', as: 'stage' });

Stage.hasMany(Rider, { foreignKey: 'stageId', as: 'riders' });
Rider.belongsTo(Stage, { foreignKey: 'stageId', as: 'stage' });

Rider.hasMany(Ride, { foreignKey: 'riderId', as: 'rides' });
Ride.belongsTo(Rider, { foreignKey: 'riderId', as: 'rider' });

Customer.hasMany(Ride, { foreignKey: 'customerId', as: 'rides' });
Ride.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Ride.hasMany(Rating, { foreignKey: 'rideId', as: 'ratings' });
Rating.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });

Rider.hasMany(Rating, { foreignKey: 'riderId', as: 'receivedRatings' });
Rating.belongsTo(Rider, { foreignKey: 'riderId', as: 'rider' });

Customer.hasMany(Rating, { foreignKey: 'customerId', as: 'givenRatings' });
Rating.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Ride.hasMany(Complaint, { foreignKey: 'rideId', as: 'complaints' });
Complaint.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });

Ride.hasOne(Payment, { foreignKey: 'rideId', as: 'payment' });
Payment.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });

Rider.hasMany(TrainingModule, { foreignKey: 'riderId', as: 'trainingModules' });
TrainingModule.belongsTo(Rider, { foreignKey: 'riderId', as: 'rider' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Rider,
  Customer,
  Agent,
  Stage,
  Ride,
  Rating,
  Complaint,
  Payment,
  TrainingModule,
  Notification
};
