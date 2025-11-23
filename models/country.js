'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Country extends Model {
    static associate(models) {
      // Adicione associações aqui se precisar no futuro
      // ex: Country.hasMany(models.User, { foreignKey: 'country_id' })
    }
  }

  Country.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true
      },

      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      }
    },
    {
      sequelize,
      modelName: 'Country',          // ficará disponível como db.Country
      tableName: 'countries',
      underscored: true,             // created_at, updated_at
      timestamps: true,              // usa created_at / updated_at
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  return Country;
};
