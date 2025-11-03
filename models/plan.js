'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Plan extends Model {
    static associate(models) {
      // Auditoria (opcional)
      Plan.belongsTo(models.User, { as: 'createdBy', foreignKey: 'created_by' });
      Plan.belongsTo(models.User, { as: 'updatedBy', foreignKey: 'updated_by' });
      Plan.belongsTo(models.User, { as: 'deletedBy', foreignKey: 'deleted_by' });
    }
  }

  Plan.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

      unique_key: { type: DataTypes.STRING(36), allowNull: false, unique: true },

      name: { type: DataTypes.STRING(120), allowNull: false },

      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },

      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },

      assistants: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },

      messages: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },

      // auditoria (FKs opcionais)
      created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
    },
    {
      sequelize,
      modelName: 'Plan',           // importante para ficar disponível como db.Plan
      tableName: 'plans',
      underscored: true,           // created_at, updated_at, deleted_at
      paranoid: true,              // usa deleted_at
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at'
    }
  );

  return Plan;
};
