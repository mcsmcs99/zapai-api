'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up (queryInterface, Sequelize) {
    const passwordHash = await bcrypt.hash('admin123', 10);

    await queryInterface.bulkInsert('users', [{
      unique_key: uuidv4(),
      name: 'Super Admin',
      email: 'admin@example.com',
      password: passwordHash,
      type: 'super_admin',
      group_id: null,
      group_parent_id: null,
      tenant_id: null,
      status: 1,
      token_expired: null,
      created_by: null,
      created_at: new Date(),
      updated_by: null,
      updated_at: new Date(),
      deleted_by: null,
      deleted_at: null
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
  }
};
