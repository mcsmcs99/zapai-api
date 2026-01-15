'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Locale extends Model {
    static associate (models) {
      Locale.hasMany(models.Group, { foreignKey: 'locale_id', as: 'groups' })
    }
  }

  Locale.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      code: {
        type: DataTypes.STRING(10), // ex: pt-BR, en-US
        allowNull: false,
        unique: true
      },

      name: {
        type: DataTypes.STRING(100), // ex: Português (Brasil)
        allowNull: false
      },

      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      }
    },
    {
      sequelize,
      modelName: 'Locale',
      tableName: 'locales',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return Locale
}
