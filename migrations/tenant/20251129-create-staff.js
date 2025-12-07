'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff', {
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
        type: Sequelize.STRING(150),
        allowNull: false
      },

      role: {
        type: Sequelize.STRING(120),
        allowNull: false
      },

      photo_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      /**
       * schedule armazenado como JSON:
       * 
       * {
       *   mon: { closed: false, intervals: [ { start: "08:30", end: "17:30" } ] },
       *   tue: { ... },
       *   ...
       * }
       */
      schedule: {
        type: Sequelize.JSON,
        allowNull: false
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
    await queryInterface.addIndex('staff', ['unique_key'], {
      unique: true,
      name: 'staff_unique_key_uindex'
    });

    await queryInterface.addIndex('staff', ['name'], {
      name: 'staff_name_idx'
    });

    await queryInterface.addIndex('staff', ['role'], {
      name: 'staff_role_idx'
    });

    await queryInterface.addIndex('staff', ['status'], {
      name: 'staff_status_idx'
    });

    await queryInterface.addIndex('staff', ['deleted_at'], {
      name: 'staff_deleted_at_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('staff');
  }
};
