'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    static associate(models) {
      // Pertence a um tenant
      Group.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

      // País (country)
      Group.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });

      // N:N com users via pivot
      Group.belongsToMany(models.User, {
        through: models.UsersGroup,
        foreignKey: 'group_id',
        otherKey: 'user_id',
        as: 'users'
      });

      // Acesso direto ao pivot
      Group.hasMany(models.UsersGroup, { foreignKey: 'group_id', as: 'memberships' });

      // Auditoria
      Group.belongsTo(models.User, { foreignKey: 'created_by', as: 'createdBy' });
      Group.belongsTo(models.User, { foreignKey: 'updated_by', as: 'updatedBy' });
      Group.belongsTo(models.User, { foreignKey: 'deleted_by', as: 'deletedBy' });
    }
  }

  Group.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      unique_key: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      document_type: { type: DataTypes.STRING(20), allowNull: true },
      document_number: { type: DataTypes.STRING(32), allowNull: true },
      company_name: { type: DataTypes.STRING(160), allowNull: true },
      company_fantasy_name: { type: DataTypes.STRING(160), allowNull: true },
      phone_fix: { type: DataTypes.STRING(20), allowNull: true },
      phone_cellular: { type: DataTypes.STRING(20), allowNull: true },
      link_instagram: { type: DataTypes.STRING(255), allowNull: true },
      link_facebook: { type: DataTypes.STRING(255), allowNull: true },
      link_whatsapp: { type: DataTypes.STRING(255), allowNull: true },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      country_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      status: {
        type: DataTypes.ENUM('active','inactive','removed','canceled'),
        allowNull: false,
        defaultValue: 'active'
      },
      created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
    },
    {
      sequelize,
      modelName: 'Group',
      tableName: 'groups',
      underscored: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at'
    }
  );

  return Group;
};
