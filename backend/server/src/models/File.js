module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    storagePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'ready', 'failed'),
      defaultValue: 'pending'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    error: {
      type: DataTypes.TEXT
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    folderId: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'files',
    underscored: true
  });

  return File;
};
