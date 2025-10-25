'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    static associate(models) {
      // Um tenant possui vários groups (empresas)
      Tenant.hasMany(models.Group, { foreignKey: 'tenant_id', as: 'groups' });

      // Auditoria (opcional)
      Tenant.belongsTo(models.User, { foreignKey: 'created_by', as: 'createdBy' });
      Tenant.belongsTo(models.User, { foreignKey: 'updated_by', as: 'updatedBy' });
      Tenant.belongsTo(models.User, { foreignKey: 'deleted_by', as: 'deletedBy' });
    }
  }

  Tenant.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      data: { type: DataTypes.TEXT, allowNull: true }, // ajuste para JSON se preferir
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'removed'),
        allowNull: false,
        defaultValue: 'active'
      },
      created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
    },
    {
      sequelize,
      modelName: 'Tenant',
      tableName: 'tenants',
      underscored: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at'
    }
  );

  return Tenant;
};
