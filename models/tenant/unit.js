// models/tenant/unit.js
'use strict'

module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('Unit', {
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

    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active'
    },

    phone: {
      type: DataTypes.STRING(25),
      allowNull: true
    },

    email: {
      type: DataTypes.STRING(120),
      allowNull: true
    },

    timezone: {
      type: DataTypes.STRING(60),
      allowNull: true
    },

    // Address
    address_line1: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    address_line2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    sublocality: {
      type: DataTypes.STRING(150),
      allowNull: true
    },

    locality: {
      type: DataTypes.STRING(150),
      allowNull: true
    },

    administrative_area: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },

    // Geo / Places
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },

    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },

    place_id: {
      type: DataTypes.STRING(120),
      allowNull: true
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
    tableName: 'units',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  })

  // associations (opcional, mas recomendado)
  Unit.associate = (models) => {
    Unit.hasMany(models.UnitLink, {
      foreignKey: 'unit_id',
      as: 'unit_links'
    })
  }

  return Unit
}
