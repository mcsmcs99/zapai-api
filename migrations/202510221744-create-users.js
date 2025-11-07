'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      unique_key: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true
      },

      name: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(160), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false },

      type: {
        type: Sequelize.ENUM('super_admin', 'owner', 'admin', 'operational', 'final_customer'),
        allowNull: false
      },

      status: {
        type: Sequelize.ENUM('pending_group', 'pending_verification', 'active', 'black_list', 'removed'),
        allowNull: false,
        defaultValue: 'active'
      },

      token_expired: { type: Sequelize.DATE, allowNull: true },

      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email_uindex' });
    await queryInterface.addIndex('users', ['unique_key'], { unique: true, name: 'users_unique_key_uindex' });
    await queryInterface.addIndex('users', ['type'], { name: 'users_type_idx' });
    await queryInterface.addIndex('users', ['status'], { name: 'users_status_idx' });
    await queryInterface.addIndex('users', ['deleted_at'], { name: 'users_deleted_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
