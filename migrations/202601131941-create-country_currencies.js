'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('country_currencies', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      country_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'countries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      currency_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'currencies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex(
      'country_currencies',
      ['country_id', 'currency_id'],
      { unique: true, name: 'country_currencies_uindex' }
    );
  },

  async down (queryInterface) {
    await queryInterface.dropTable('country_currencies');
  }
};
