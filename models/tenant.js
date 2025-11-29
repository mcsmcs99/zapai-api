'use strict';
const { Model } = require('sequelize');
const { createDatabaseIfNotExists } = require('../src/lib/mysql-provisioner.js');
const { exec } = require('child_process')
const util = require('util')
const path = require('path')

const execAsync = util.promisify(exec)

function sanitizeDbName (raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) throw new Error('Tenant.data (db name) vazio.');
  return s.replace(/[^a-z0-9_]/g, '_');
}

/**
 * Roda as migrations do tenant após criação do banco.
 */
async function runTenantMigrations (dbName) {
  // Estamos DENTRO do container api → não usamos docker compose aqui
  const cmd = 'node scripts/tenant/tenantMigrations.js migrate'

  // Rodar a partir da raiz do projeto (models/.. => raiz)
  const cwd = path.join(__dirname, '..')

  console.log(
    '[tenant:afterCreate] running tenant migrations:',
    cmd,
    '| dbName =',
    dbName,
    '| cwd =',
    cwd
  )

  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd })

    if (stdout) {
      console.log('[tenant:afterCreate:migrations] stdout:\n', stdout)
    }
    if (stderr) {
      console.warn('[tenant:afterCreate:migrations] stderr:\n', stderr)
    }

    console.log('[tenant:afterCreate] migrations executed successfully for DB:', dbName)
  } catch (err) {
    console.error(
      '[tenant:afterCreate] failed to run tenant migrations:',
      err?.message || err
    )
    // se você NÃO quiser quebrar o fluxo de criação do tenant, comenta o throw:
    // throw err
  }
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
            await runTenantMigrations(dbName);
          };

          if (options?.transaction?.afterCommit) {
            console.log('[tenant:afterCreate] agendando para pós-COMMIT');
            options.transaction.afterCommit(() => {
              run().catch(err => {
                console.error('[tenant:afterCreate] falhou ao provisionar tenant:', err?.message || err);
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
