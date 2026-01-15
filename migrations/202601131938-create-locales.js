'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('locales', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      code: {
        type: Sequelize.STRING(10), // ex: pt-BR, en-US
        allowNull: false,
        unique: true
      },

      name: {
        type: Sequelize.STRING(100), // ex: Português (Brasil)
        allowNull: false
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

    await queryInterface.addIndex('locales', ['code'], {
      unique: true,
      name: 'locales_code_uindex'
    });

    await queryInterface.addIndex('locales', ['status'], {
      name: 'locales_status_idx'
    });
  },

  async down (queryInterface) {
    await queryInterface.dropTable('locales');
  }
};
