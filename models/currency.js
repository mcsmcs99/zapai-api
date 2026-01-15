'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Currency extends Model {
    static associate (models) {
      Currency.hasMany(models.Group, { foreignKey: 'currency_id', as: 'groups' })
    }
  }

  Currency.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      code: {
        type: DataTypes.STRING(3), // ISO 4217: BRL, USD, EUR
        allowNull: false,
        unique: true
      },

      name: {
        type: DataTypes.STRING(100), // ex: Real Brasileiro
        allowNull: false
      },

      symbol: {
        type: DataTypes.STRING(10), // R$, $, €
        allowNull: true
      },

      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      }
    },
    {
      sequelize,
      modelName: 'Currency',
      tableName: 'currencies',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return Currency
}
