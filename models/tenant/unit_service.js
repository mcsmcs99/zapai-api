// models/tenant/unit_service.js
'use strict'

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'UnitService',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      unit_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      service_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      status: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1
      }
    },
    {
      tableName: 'unit_service',
      underscored: true,
      timestamps: true,
      paranoid: false
    }
  )
}
