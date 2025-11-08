/* eslint-disable no-console */
const path = require('path');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const { ensureTenantDb } = require('../../src/lib/mysql-provisioner');

// ---- helpers ---------------------------------------------------------------
function getAppPool () {
  return mysql.createPool({
    host: process.env.DB_HOST || 'mysql',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASS || 'app',
    database: process.env.DB_NAME || 'zapai_api',
    waitForConnections: true,
    connectionLimit: 5
  });
}

async function listAllTenants () {
  const pool = getAppPool();
  const [rows] = await pool.query(`
    SELECT id, data
      FROM tenants
     WHERE deleted_at IS NULL
  `);
  return rows
    .map(r => ({ id: r.id, dbName: String(r.data || '').trim() }))
    .filter(r => r.dbName.length > 0);
}

async function ensureSequelizeMeta (dbName) {
  const host = process.env.DB_HOST || 'mysql';
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
  const user = process.env.DB_USER || 'app';
  const pass = process.env.DB_PASS || 'app';

  const conn = await mysql.createConnection({ host, port, user, password: pass, database: dbName });
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`SequelizeMeta\` (
        name VARCHAR(255) PRIMARY KEY
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } finally {
    await conn.end();
  }
}

// ---- execução por-tenant ---------------------------------------------------
async function runForTenant (action, dbName) {
  if (!dbName) throw new Error('dbName inválido');

  await ensureTenantDb(dbName);
  await ensureSequelizeMeta(dbName);

  const host = process.env.DB_HOST || 'mysql';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER || 'app';
  const pass = process.env.DB_PASS || 'app';
  const url  = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}`;

  const migrationsPath = path.resolve(process.cwd(), 'migrations/tenant');
  const seedersPath    = path.resolve(process.cwd(), 'seeders/tenant');

  const cmdMap = {
    migrate : `npx sequelize-cli db:migrate --url "${url}" --migrations-path "${migrationsPath}"`,
    seed    : `npx sequelize-cli db:seed:all --url "${url}" --seeders-path "${seedersPath}"`,
    undo    : `npx sequelize-cli db:migrate:undo:all --url "${url}" --migrations-path "${migrationsPath}"`
  };

  const cmd = cmdMap[action];
  if (!cmd) throw new Error(`Ação inválida: ${action}`);

  console.log(`\n[tenant:${dbName}] => ${action}`);
  console.log('[tenant:cmd] =', cmd.replace(/:[^@]+@/, ':***@'));
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ ${action} concluído para: ${dbName}`);
}

// ---- MAIN ------------------------------------------------------------------
(async () => {
  try {
    const action = (process.argv[2] || '').toLowerCase();   // migrate | seed | undo
    const argDb  = process.argv[3];                         // opcional (dbName OU groupId numérico)

    if (!['migrate', 'seed', 'undo'].includes(action)) {
      console.error('Uso: node scripts/tenant/tenantMigrations.js <migrate|seed|undo> [<dbName|groupId>]');
      process.exit(1);
    }

    if (argDb) {
      const dbName = /^\d+$/.test(argDb) ? `zapai_api_${argDb}` : argDb;
      await runForTenant(action, dbName);
      return;
    }

    console.log('[all-tenants] buscando tenants na base principal...');
    const tenants = await listAllTenants();
    if (!tenants.length) {
      console.log('[all-tenants] nenhum tenant encontrado.');
      return;
    }

    console.log(`[all-tenants] encontrados: ${tenants.length}`);
    const results = [];

    for (const t of tenants) {
      try {
        await runForTenant(action, t.dbName);
        results.push({ db: t.dbName, ok: true });
      } catch (err) {
        console.error(`❌ Falha em ${t.dbName}:`, err?.message || err);
        results.push({ db: t.dbName, ok: false, err: err?.message || String(err) });
      }
    }

    const okCount  = results.filter(r => r.ok).length;
    const badCount = results.length - okCount;
    console.log('\n—— Resumo ——');
    console.log('Sucesso:', okCount, '| Falha:', badCount);
    results.forEach(r => {
      console.log(`${r.ok ? '✅' : '❌'} ${r.db}${r.ok ? '' : ` -> ${r.err}`}`);
    });
  } catch (e) {
    console.error('Erro geral:', e?.message || e);
    process.exit(1);
  }
})();
