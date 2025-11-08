'use strict';
const { Model } = require('sequelize');
const { createDatabaseIfNotExists } = require('../src/lib/mysql-provisioner.js');

function sanitizeDbName (raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) throw new Error('Tenant.data (db name) vazio.');
  return s.replace(/[^a-z0-9_]/g, '_');
}

module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    static associate(models) {
      Tenant.hasMany(models.Group, { foreignKey: 'tenant_id', as: 'groups' });
      Tenant.belongsTo(models.User, { foreignKey: 'created_by', as: 'createdBy' });
      Tenant.belongsTo(models.User, { foreignKey: 'updated_by', as: 'updatedBy' });
      Tenant.belongsTo(models.User, { foreignKey: 'deleted_by', as: 'deletedBy' });
    }
  }

  Tenant.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      data: { type: DataTypes.STRING(191), allowNull: false },
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
      deletedAt: 'deleted_at',
      hooks: {
        async afterCreate(tenant, options) {
          console.log('[tenant:afterCreate] start');
          console.log('[tenant:afterCreate] tenant.id    =', tenant?.id);
          console.log('[tenant:afterCreate] tenant.data  =', tenant?.data);
          console.log('[tenant:afterCreate] tx present?  =', !!options?.transaction);

          const dbName = sanitizeDbName(tenant.data);
          const run = async () => {
            console.log('[tenant:afterCreate] provision(admin):', dbName);
            await createDatabaseIfNotExists(dbName); // usa root
            console.log('[tenant:afterCreate] DB criado com sucesso:', dbName);
          };

          if (options?.transaction?.afterCommit) {
            console.log('[tenant:afterCreate] agendando para pós-COMMIT');
            options.transaction.afterCommit(() => {
              run().catch(err => {
                console.error('[tenant:afterCreate] falhou ao criar DB:', err?.message || err);
              });
            });
          } else {
            await run();
          }
        }
      }
    }
  );

  return Tenant;
};
