'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_staff', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },

      service_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },

      staff_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },

      status: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1
      },

      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      updated_at: { type: Sequelize.DATE, allowNull: true, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    })

    // FKs
    await queryInterface.addConstraint('service_staff', {
      fields: ['service_id'],
      type: 'foreign key',
      name: 'fk_service_staff_service_id',
      references: { table: 'services', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    })

    await queryInterface.addConstraint('service_staff', {
      fields: ['staff_id'],
      type: 'foreign key',
      name: 'fk_service_staff_staff_id',
      references: { table: 'staff', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    })

    // Índices (evita duplicidade do vínculo)
    await queryInterface.addIndex('service_staff', ['service_id', 'staff_id'], {
      unique: true,
      name: 'ux_service_staff_service_id_staff_id'
    })

    await queryInterface.addIndex('service_staff', ['service_id'], { name: 'ix_service_staff_service_id' })
    await queryInterface.addIndex('service_staff', ['staff_id'], { name: 'ix_service_staff_staff_id' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('service_staff')
  }
}
