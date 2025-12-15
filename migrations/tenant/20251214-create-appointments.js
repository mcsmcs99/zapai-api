'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('appointments', {
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

      // relacionamento com service
      service_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },

      // relacionamento com staff (colaborador)
      collaborator_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },

      // cliente do banco principal (users.id)
      /**
       * customer_id:
       * - ID do cliente (users.id) no BANCO PRINCIPAL (main database)
       * - Não possui FK aqui pois referencia outra base
       */
      customer_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },

      // data do agendamento (YYYY-MM-DD)
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      // horários (HH:mm)
      start: {
        type: Sequelize.STRING(5),
        allowNull: false
      },

      end: {
        type: Sequelize.STRING(5),
        allowNull: false
      },

      // valor final (normalmente o preço do serviço no momento do agendamento)
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0
      },

      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'done', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },

      // opcional: notas/observações
      notes: {
        type: Sequelize.TEXT,
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
    })

    // FKs (somente dentro do tenant DB)
    await queryInterface.addConstraint('appointments', {
      fields: ['service_id'],
      type: 'foreign key',
      name: 'appointments_service_id_fk',
      references: { table: 'services', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    })

    await queryInterface.addConstraint('appointments', {
      fields: ['collaborator_id'],
      type: 'foreign key',
      name: 'appointments_collaborator_id_fk',
      references: { table: 'staff', field: 'id' }, // ajuste se sua tabela tiver outro nome
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    })

    // Índices
    await queryInterface.addIndex('appointments', ['unique_key'], {
      unique: true,
      name: 'appointments_unique_key_uindex'
    })

    await queryInterface.addIndex('appointments', ['date'], {
      name: 'appointments_date_idx'
    })

    await queryInterface.addIndex('appointments', ['status'], {
      name: 'appointments_status_idx'
    })

    await queryInterface.addIndex('appointments', ['service_id'], {
      name: 'appointments_service_id_idx'
    })

    await queryInterface.addIndex('appointments', ['collaborator_id'], {
      name: 'appointments_collaborator_id_idx'
    })

    await queryInterface.addIndex('appointments', ['customer_id'], {
      name: 'appointments_customer_id_idx'
    })

    // índice composto (agenda do colaborador por dia)
    await queryInterface.addIndex('appointments', ['collaborator_id', 'date'], {
      name: 'appointments_collaborator_date_idx'
    })

    await queryInterface.addIndex('appointments', ['deleted_at'], {
      name: 'appointments_deleted_at_idx'
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('appointments')
  }
}
