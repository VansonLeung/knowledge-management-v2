module.exports = (sequelize, DataTypes) => {
  const Folder = sequelize.define('Folder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    referencePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'folders',
    underscored: true
  });

  return Folder;
};
