'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // locale_id -> locales.id
    await queryInterface.addColumn('groups', 'locale_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      after: 'country_id',
      references: { model: 'locales', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // currency_id -> currencies.id
    await queryInterface.addColumn('groups', 'currency_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      after: 'locale_id',
      references: { model: 'currencies', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // índices (recomendado)
    await queryInterface.addIndex('groups', ['locale_id'], {
      name: 'groups_locale_id_idx'
    });

    await queryInterface.addIndex('groups', ['currency_id'], {
      name: 'groups_currency_id_idx'
    });
  },

  async down (queryInterface) {
    await queryInterface.removeIndex('groups', 'groups_locale_id_idx');
    await queryInterface.removeIndex('groups', 'groups_currency_id_idx');

    await queryInterface.removeColumn('groups', 'currency_id');
    await queryInterface.removeColumn('groups', 'locale_id');
  }
};
