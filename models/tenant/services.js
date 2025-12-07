// models/tenant/service.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
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

    title: {
      type: DataTypes.STRING(180),
      allowNull: false
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },

    // duração em minutos
    duration: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 30
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // JSON com ids de staff que podem executar o serviço: [1, 2, 3]
    collaborator_ids: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
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
    tableName: 'services',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  })

  return Service
}
