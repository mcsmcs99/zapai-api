'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // 1) Adiciona a coluna com o mesmo tipo do countries.id
    await queryInterface.addColumn('groups', 'country_id', {
      type: Sequelize.INTEGER.UNSIGNED, // 👈 bate com id UNSIGNED
      allowNull: true
    });

    // 2) Adiciona a foreign key
    await queryInterface.addConstraint('groups', {
      fields: ['country_id'],
      type: 'foreign key',
      name: 'groups_country_id_foreign_idx', // mesmo nome que o erro mostrou
      references: {
        table: 'countries',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    // remove a constraint primeiro
    await queryInterface.removeConstraint('groups', 'groups_country_id_foreign_idx');
    // depois remove a coluna
    await queryInterface.removeColumn('groups', 'country_id');
  }
};
