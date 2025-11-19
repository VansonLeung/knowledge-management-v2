module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'conversations',
    underscored: true
  });

  return Conversation;
};
