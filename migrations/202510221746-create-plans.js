'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('plans', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      unique_key: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true
      },

      name: {
        type: Sequelize.STRING(120),
        allowNull: false
      },

      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },

      assistants: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
      },

      messages: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },

      // ---- auditoria com FK -> users(id)
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      deleted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Índices úteis
    await queryInterface.addIndex('plans', ['unique_key'], {
      unique: true,
      name: 'plans_unique_key_uindex'
    });
    await queryInterface.addIndex('plans', ['status'], { name: 'plans_status_idx' });
    await queryInterface.addIndex('plans', ['deleted_at'], { name: 'plans_deleted_at_idx' });
    await queryInterface.addIndex('plans', ['created_by'], { name: 'plans_created_by_idx' });
    await queryInterface.addIndex('plans', ['updated_by'], { name: 'plans_updated_by_idx' });
    await queryInterface.addIndex('plans', ['deleted_by'], { name: 'plans_deleted_by_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('plans'); // derruba FKs/ENUMs junto
  }
};
