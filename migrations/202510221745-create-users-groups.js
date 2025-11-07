'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users_groups', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      // FK → users.id
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      // FK → groups.id
      group_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'groups', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      invited_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },

      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },

      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },

      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },

      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },

      deleted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },

      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    // garante um vínculo único por par
    await queryInterface.addConstraint('users_groups', {
      fields: ['user_id', 'group_id'],
      type: 'unique',
      name: 'users_groups_user_group_unique'
    });

    await queryInterface.addIndex('users_groups', ['user_id'], { name: 'users_groups_user_idx' });
    await queryInterface.addIndex('users_groups', ['group_id'], { name: 'users_groups_group_idx' });
    await queryInterface.addIndex('users_groups', ['deleted_at'], { name: 'users_groups_deleted_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users_groups');
  }
};
