'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('services', {
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

      title: {
        type: Sequelize.STRING(180),
        allowNull: false
      },

      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0
      },

      // duração em minutos
      duration: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 30
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      /**
       * Lista de colaboradores (staff) que podem executar este serviço.
       * Armazenado como JSON:
       *   [1, 2, 3]  // IDs de staff
       */
      collaborator_ids: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
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

    // Índices
    await queryInterface.addIndex('services', ['unique_key'], {
      unique: true,
      name: 'services_unique_key_uindex'
    });

    await queryInterface.addIndex('services', ['title'], {
      name: 'services_title_idx'
    });

    await queryInterface.addIndex('services', ['status'], {
      name: 'services_status_idx'
    });

    await queryInterface.addIndex('services', ['deleted_at'], {
      name: 'services_deleted_at_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('services');
  }
};
