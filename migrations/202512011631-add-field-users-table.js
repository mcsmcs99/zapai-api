'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Adiciona a coluna com tipo compatível com groups.id
    await queryInterface.addColumn('users', 'current_group_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null
    });

    // 2) Cria a FK apontando para groups.id
    await queryInterface.addConstraint('users', {
      fields: ['current_group_id'],
      type: 'foreign key',
      name: 'fk_users_current_group_id_groups', // nome da constraint
      references: {
        table: 'groups',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove primeiro a FK, depois a coluna
    await queryInterface.removeConstraint('users', 'fk_users_current_group_id_groups');
    await queryInterface.removeColumn('users', 'current_group_id');
  }
};
