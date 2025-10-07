'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // ex.: User.hasMany(models.Appointment, { foreignKey: 'user_id' })
    }
  }

  User.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      unique_key: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
      password: { type: DataTypes.STRING(255), allowNull: false },
      type: {
        type: DataTypes.ENUM('super_admin','owner','admin','operational','final_customer'),
        allowNull: false
      },
      group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      group_parent_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      status: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
      token_expired: { type: DataTypes.DATE, allowNull: true },
      created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,            // mapeia created_at / updated_at / deleted_at
      paranoid: true,               // usa deleted_at
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      defaultScope: {
        attributes: { exclude: ['password'] } // nunca expõe a senha por padrão
      },
      scopes: {
        withPassword: {}            // use: User.scope('withPassword').findOne(...)
      }
    }
  );

  return User;
};
