'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupsPlanPayment extends Model {
    static associate(models) {
      // FKs principais
      GroupsPlanPayment.belongsTo(models.Group, { foreignKey: 'group_id', as: 'group' });
      GroupsPlanPayment.belongsTo(models.Plan,  { foreignKey: 'plan_id',  as: 'plan'  });

      // Auditoria
      GroupsPlanPayment.belongsTo(models.User,  { foreignKey: 'created_by', as: 'createdBy' });
      GroupsPlanPayment.belongsTo(models.User,  { foreignKey: 'updated_by', as: 'updatedBy' });
      GroupsPlanPayment.belongsTo(models.User,  { foreignKey: 'deleted_by', as: 'deletedBy' });
    }
  }

  GroupsPlanPayment.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

      unique_key: { type: DataTypes.STRING(36), allowNull: false, unique: true },

      group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      plan_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

      status: {
        type: DataTypes.ENUM('approved', 'refused', 'canceled'),
        allowNull: false,
        defaultValue: 'approved'
      },

      price:    { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },

      cupon:    { type: DataTypes.STRING(80), allowNull: true },

      type: {
        type: DataTypes.ENUM('credit_card', 'pix', 'billet'),
        allowNull: false
      },

      req_gateway: { type: DataTypes.JSON, allowNull: true },
      res_gateway: { type: DataTypes.JSON, allowNull: true },

      created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
    },
    {
      sequelize,
      modelName: 'GroupsPlanPayment',
      tableName: 'groups_plan_payments',
      underscored: true,
      paranoid: true,                // usa deleted_at
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at'
    }
  );

  return GroupsPlanPayment;
};
