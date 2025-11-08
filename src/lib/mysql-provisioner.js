// src/lib/mysql-provisioner.js
const mysql = require('mysql2/promise');

let pool;
function getAdminPool () {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_ADMIN_HOST || process.env.DB_HOST || 'mysql',
      user: process.env.DB_ADMIN_USER || 'root',
      password: process.env.DB_ADMIN_PASS || 'root',
      waitForConnections: true,
      connectionLimit: 3
    });
  }
  return pool;
}

async function createDatabaseIfNotExists (dbName) {
  const sql = `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;
  const pool = getAdminPool();
  await pool.query(sql);
}

module.exports = { createDatabaseIfNotExists };
