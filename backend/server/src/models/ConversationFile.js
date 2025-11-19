module.exports = (sequelize, DataTypes) => {
  const ConversationFile = sequelize.define('ConversationFile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    fileId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'conversation_files',
    underscored: true
  });

  return ConversationFile;
};
