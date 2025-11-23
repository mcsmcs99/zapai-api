'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('countries', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
        unique: true
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },

      // timestamps básicos (se quiser remover, pode tirar estes campos)
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

    // Índices úteis
    await queryInterface.addIndex('countries', ['name'], {
      unique: true,
      name: 'countries_name_uindex'
    });

    await queryInterface.addIndex('countries', ['status'], {
      name: 'countries_status_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('countries');
  }
};
