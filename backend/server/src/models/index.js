const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// Import models here
// const User = require('./user.model')(sequelize, DataTypes);
// const Conversation = require('./conversation.model')(sequelize, DataTypes);
// const Message = require('./message.model')(sequelize, DataTypes);
// const File = require('./file.model')(sequelize, DataTypes);

// Define associations here
// User.hasMany(Conversation);
// Conversation.belongsTo(User);
// ...

const db = {
  sequelize,
  Sequelize: require('sequelize'),
  // User,
  // Conversation,
  // Message,
  // File
};

module.exports = db;
