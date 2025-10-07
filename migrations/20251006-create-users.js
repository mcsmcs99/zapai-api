'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      unique_key: {
        // use como UUID/ULID se quiser (guarda como string)
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true
      },

      name: {
        type: Sequelize.STRING(120),
        allowNull: false
      },

      email: {
        type: Sequelize.STRING(160),
        allowNull: false,
        unique: true
      },

      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },

      type: {
        type: Sequelize.ENUM(
          'super_admin',
          'owner',
          'admin',
          'operational',
          'final_customer'
        ),
        allowNull: false
        // se quiser, pode definir um default:
        // defaultValue: 'final_customer'
      },

      group_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },

      group_parent_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },

      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true // coloque false se for obrigatório no seu multi-tenant
      },

      status: {
        // 1=ativo, 0=inativo (ajuste conforme sua regra)
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1
      },

      token_expired: {
        // quando o token expira (ou nulo se não houver)
        type: Sequelize.DATE,
        allowNull: true
      },

      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },

      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },

      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },

      deleted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Índices úteis
    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'users_email_uindex'
    });

    await queryInterface.addIndex('users', ['unique_key'], {
      unique: true,
      name: 'users_unique_key_uindex'
    });

    await queryInterface.addIndex('users', ['tenant_id'], { name: 'users_tenant_idx' });
    await queryInterface.addIndex('users', ['group_id'], { name: 'users_group_idx' });
    await queryInterface.addIndex('users', ['group_parent_id'], { name: 'users_group_parent_idx' });
    await queryInterface.addIndex('users', ['type'], { name: 'users_type_idx' });
    await queryInterface.addIndex('users', ['status'], { name: 'users_status_idx' });
    await queryInterface.addIndex('users', ['deleted_at'], { name: 'users_deleted_at_idx' });
  },

  async down(queryInterface /*, Sequelize */) {
    // Remover a tabela já elimina o ENUM no MySQL
    await queryInterface.dropTable('users');
  }
};
