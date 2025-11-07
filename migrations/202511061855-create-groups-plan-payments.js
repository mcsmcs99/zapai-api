'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('groups_plan_payments', {
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

      // FKs
      group_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'groups', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      plan_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'plans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      status: {
        // conforme print: approved, refused, canceled
        type: Sequelize.ENUM('approved', 'refused', 'canceled'),
        allowNull: false,
        defaultValue: 'approved'
      },

      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },

      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },

      // mantive o nome do print
      cupon: {
        type: Sequelize.STRING(80),
        allowNull: true
      },

      type: {
        // conforme print: credit_card, pix, billet
        type: Sequelize.ENUM('credit_card', 'pix', 'billet'),
        allowNull: false
      },

      // payloads do gateway de pagamento
      req_gateway: {
        type: Sequelize.JSON,
        allowNull: true
      },

      res_gateway: {
        type: Sequelize.JSON,
        allowNull: true
      },

      // auditoria (FK -> users.id)
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

    // Índices
    await queryInterface.addIndex('groups_plan_payments', ['unique_key'], {
      unique: true,
      name: 'gpp_unique_key_uindex'
    });
    await queryInterface.addIndex('groups_plan_payments', ['group_id'], { name: 'gpp_group_id_idx' });
    await queryInterface.addIndex('groups_plan_payments', ['plan_id'], { name: 'gpp_plan_id_idx' });
    await queryInterface.addIndex('groups_plan_payments', ['status'], { name: 'gpp_status_idx' });
    await queryInterface.addIndex('groups_plan_payments', ['type'], { name: 'gpp_type_idx' });
    await queryInterface.addIndex('groups_plan_payments', ['deleted_at'], { name: 'gpp_deleted_at_idx' });
    await queryInterface.addIndex('groups_plan_payments', ['created_by'], { name: 'gpp_created_by_idx' });
    await queryInterface.addIndex('groups_plan_payments', ['updated_by'], { name: 'gpp_updated_by_idx' });
    await queryInterface.addIndex('groups_plan_payments', ['deleted_by'], { name: 'gpp_deleted_by_idx' });
  },

  async down (queryInterface, Sequelize) {
    // dropar tabela remove enums e FKs
    await queryInterface.dropTable('groups_plan_payments');
  }
};
