// models/tenant/service_staff.js
'use strict'

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'ServiceStaff',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      service_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      staff_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      status: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1
      }
    },
    {
      tableName: 'service_staff',
      underscored: true,
      timestamps: true,
      paranoid: false
    }
  )
}
