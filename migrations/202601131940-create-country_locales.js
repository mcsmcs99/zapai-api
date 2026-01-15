'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('country_locales', {
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

      locale_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'locales', key: 'id' },
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
      'country_locales',
      ['country_id', 'locale_id'],
      { unique: true, name: 'country_locales_uindex' }
    );
  },

  async down (queryInterface) {
    await queryInterface.dropTable('country_locales');
  }
};
