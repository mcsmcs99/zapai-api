'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // N:N com groups via pivot
      User.belongsToMany(models.Group, {
        through: models.UsersGroup,
        foreignKey: 'user_id',
        otherKey: 'group_id',
        as: 'groups'
      });

      // Acesso direto ao pivot
      User.hasMany(models.UsersGroup, { foreignKey: 'user_id', as: 'memberships' });

      // Auditoria
      User.belongsTo(models.User, { foreignKey: 'created_by', as: 'createdBy' });
      User.belongsTo(models.User, { foreignKey: 'updated_by', as: 'updatedBy' });
      User.belongsTo(models.User, { foreignKey: 'deleted_by', as: 'deletedBy' });
    }

    isSuperAdmin() { return this.type === 'super_admin'; }
  }

  User.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      unique_key: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(160), allowNull: false, unique: true, validate: { isEmail: true } },
      password: { type: DataTypes.STRING(255), allowNull: false },
      token_verification: { type: DataTypes.STRING(255), defaultValue: null },
      type: {
        type: DataTypes.ENUM('super_admin','owner','admin','operational','final_customer'),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending_group','pending_verification','active','black_list','removed'),
        allowNull: false,
        defaultValue: 'active'
      },
      token_expired: { type: DataTypes.DATE, allowNull: true },
      created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      defaultScope: { attributes: { exclude: ['password'] } },
      scopes: { withPassword: {} }
    }
  );

  return User;
};
