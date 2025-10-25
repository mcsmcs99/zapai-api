'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      // JSON/texto com dados gerais do tenant (ajuste o tipo se preferir JSON)
      data: { type: Sequelize.TEXT, allowNull: true },

      status: {
        type: Sequelize.ENUM('active', 'inactive', 'removed'),
        allowNull: false,
        defaultValue: 'active'
      },

      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.addIndex('tenants', ['status'], { name: 'tenants_status_idx' });
    await queryInterface.addIndex('tenants', ['deleted_at'], { name: 'tenants_deleted_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tenants');
  }
};
