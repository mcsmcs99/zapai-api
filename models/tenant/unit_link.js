// models/tenant/unit_link.js
'use strict'

module.exports = (sequelize, DataTypes) => {
  const UnitLink = sequelize.define('UnitLink', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },

    unit_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },

    type: {
      type: DataTypes.STRING(40),
      allowNull: false
    },

    provider: {
      type: DataTypes.STRING(40),
      allowNull: true
    },

    url: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    label: {
      type: DataTypes.STRING(80),
      allowNull: true
    },

    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    tableName: 'unit_links',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  })

  UnitLink.associate = (models) => {
    UnitLink.belongsTo(models.Unit, {
      foreignKey: 'unit_id',
      as: 'unit'
    })
  }

  return UnitLink
}
