'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class CountryCurrency extends Model {
    static associate (models) {
      CountryCurrency.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' })
      CountryCurrency.belongsTo(models.Currency, { foreignKey: 'currency_id', as: 'currency' })
    }
  }

  CountryCurrency.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      country_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      currency_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    {
      sequelize,
      modelName: 'CountryCurrency',
      tableName: 'country_currencies',
      underscored: true,
      timestamps: false,
      createdAt: 'created_at'
    }
  )

  return CountryCurrency
}
