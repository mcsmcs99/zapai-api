'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UsersGroup extends Model {
    static associate(models) {
      UsersGroup.belongsTo(models.User,  { foreignKey: 'user_id',  as: 'user'  });
      UsersGroup.belongsTo(models.Group, { foreignKey: 'group_id', as: 'group' });
      // Auditoria
      UsersGroup.belongsTo(models.User, { foreignKey: 'invited_by', as: 'invitedBy' });
      UsersGroup.belongsTo(models.User, { foreignKey: 'created_by', as: 'createdBy' });
      UsersGroup.belongsTo(models.User, { foreignKey: 'updated_by', as: 'updatedBy' });
      UsersGroup.belongsTo(models.User, { foreignKey: 'deleted_by', as: 'deletedBy' });
    }
  }

  UsersGroup.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      invited_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
    },
    {
      sequelize,
      modelName: 'UsersGroup',
      tableName: 'users_groups',
      underscored: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      indexes: [
        { unique: true, fields: ['user_id', 'group_id'], name: 'users_groups_user_group_unique' }
      ]
    }
  );

  return UsersGroup;
};
