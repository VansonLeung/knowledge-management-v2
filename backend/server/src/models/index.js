const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const User = require('./User')(sequelize, DataTypes);
const Conversation = require('./Conversation')(sequelize, DataTypes);
const Message = require('./Message')(sequelize, DataTypes);
const Folder = require('./Folder')(sequelize, DataTypes);
const File = require('./File')(sequelize, DataTypes);
const ConversationFile = require('./ConversationFile')(sequelize, DataTypes);

// Associations
User.hasMany(Conversation, { foreignKey: 'userId', as: 'conversations' });
Conversation.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'author' });

User.hasMany(Folder, { foreignKey: 'ownerId', as: 'folders' });
Folder.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Folder.hasMany(Folder, { foreignKey: 'parentId', as: 'children' });
Folder.belongsTo(Folder, { foreignKey: 'parentId', as: 'parent' });

Folder.hasMany(File, { foreignKey: 'folderId', as: 'files' });
File.belongsTo(Folder, { foreignKey: 'folderId', as: 'folder' });

User.hasMany(File, { foreignKey: 'ownerId', as: 'files' });
File.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Conversation.belongsToMany(File, {
  through: ConversationFile,
  foreignKey: 'conversationId',
  otherKey: 'fileId',
  as: 'files'
});
File.belongsToMany(Conversation, {
  through: ConversationFile,
  foreignKey: 'fileId',
  otherKey: 'conversationId',
  as: 'conversations'
});

const db = {
  sequelize,
  Sequelize: require('sequelize'),
  User,
  Conversation,
  Message,
  Folder,
  File,
  ConversationFile
};

module.exports = db;
