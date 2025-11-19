module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'messages',
    underscored: true
  });

  return Message;
};
