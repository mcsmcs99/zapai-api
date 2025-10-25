'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('groups', {
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

      document_type: { type: Sequelize.STRING(20), allowNull: true },
      document_number: { type: Sequelize.STRING(32), allowNull: true },
      company_name: { type: Sequelize.STRING(160), allowNull: true },
      company_fantasy_name: { type: Sequelize.STRING(160), allowNull: true },
      phone_fix: { type: Sequelize.STRING(20), allowNull: true },
      phone_cellular: { type: Sequelize.STRING(20), allowNull: true },
      link_instagram: { type: Sequelize.STRING(255), allowNull: true },
      link_facebook: { type: Sequelize.STRING(255), allowNull: true },
      link_whatsapp: { type: Sequelize.STRING(255), allowNull: true },

      // FK → tenants.id
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT' // ou 'CASCADE' se quiser apagar grupos junto com o tenant
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive', 'removed', 'canceled'),
        allowNull: false,
        defaultValue: 'active'
      },

      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.addIndex('groups', ['unique_key'], { unique: true, name: 'groups_unique_key_uindex' });
    await queryInterface.addIndex('groups', ['tenant_id'], { name: 'groups_tenant_idx' });
    await queryInterface.addIndex('groups', ['status'], { name: 'groups_status_idx' });
    await queryInterface.addIndex('groups', ['deleted_at'], { name: 'groups_deleted_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('groups');
  }
};
