'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class CountryLocale extends Model {
    static associate (models) {
      CountryLocale.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' })
      CountryLocale.belongsTo(models.Locale, { foreignKey: 'locale_id', as: 'locale' })
    }
  }

  CountryLocale.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      country_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      locale_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    {
      sequelize,
      modelName: 'CountryLocale',
      tableName: 'country_locales',
      underscored: true,
      timestamps: false,
      createdAt: 'created_at'
    }
  )

  return CountryLocale
}
