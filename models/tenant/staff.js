// models/tenant/staff.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const Staff = sequelize.define('Staff', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },

    unique_key: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },

    role: {
      type: DataTypes.STRING(120),
      allowNull: false
    },

    photo_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    // JSON no formato:
    // { mon: { closed: false, intervals: [ { start, end } ] }, ... }
    schedule: {
      type: DataTypes.JSON,
      allowNull: false
    },

    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active'
    },

    created_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },

    updated_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },

    deleted_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    },

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'staff',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  Staff.associate = function (models) {
    // Exemplo se quiser amarrar com User depois:
    // Staff.belongsTo(models.User, { as: 'creator', foreignKey: 'created_by' });
    // Staff.belongsTo(models.User, { as: 'updater', foreignKey: 'updated_by' });
    // Staff.belongsTo(models.User, { as: 'deleter', foreignKey: 'deleted_by' });
  };

  return Staff;
};
