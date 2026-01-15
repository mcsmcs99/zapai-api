'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('currencies', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      code: {
        type: Sequelize.STRING(3), // ISO 4217: BRL, USD, EUR
        allowNull: false,
        unique: true
      },

      name: {
        type: Sequelize.STRING(100), // ex: Real Brasileiro
        allowNull: false
      },

      symbol: {
        type: Sequelize.STRING(10), // R$, $, €
        allowNull: true
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('currencies', ['code'], {
      unique: true,
      name: 'currencies_code_uindex'
    });

    await queryInterface.addIndex('currencies', ['status'], {
      name: 'currencies_status_idx'
    });
  },

  async down (queryInterface) {
    await queryInterface.dropTable('currencies');
  }
};
