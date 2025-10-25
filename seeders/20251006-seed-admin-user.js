'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = await import('uuid');
    const now = new Date();

    const passwordHash = await bcrypt.hash('admin123', 10);

    await queryInterface.bulkInsert('users', [{
      unique_key: uuidv4(),
      name: 'Super Admin',
      email: 'admin@example.com',
      password: passwordHash,
      type: 'super_admin',
      status: 'active',           // ENUM, não número
      token_expired: null,
      created_by: null,
      created_at: now,
      updated_by: null,
      updated_at: now,
      deleted_by: null,
      deleted_at: null
    }], {});
  },

  async down(queryInterface /*, Sequelize */) {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
  }
};