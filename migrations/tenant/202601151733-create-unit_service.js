'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('unit_service', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },

      unit_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },

      service_id: {
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
    await queryInterface.addConstraint('unit_service', {
      fields: ['unit_id'],
      type: 'foreign key',
      name: 'fk_unit_service_unit_id',
      references: { table: 'units', field: 'id' }, // <-- ajuste aqui se o nome da tabela for outro
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    })

    await queryInterface.addConstraint('unit_service', {
      fields: ['service_id'],
      type: 'foreign key',
      name: 'fk_unit_service_service_id',
      references: { table: 'services', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    })

    // Índices (evita duplicidade do vínculo)
    await queryInterface.addIndex('unit_service', ['unit_id', 'service_id'], {
      unique: true,
      name: 'ux_unit_service_unit_id_service_id'
    })

    await queryInterface.addIndex('unit_service', ['unit_id'], { name: 'ix_unit_service_unit_id' })
    await queryInterface.addIndex('unit_service', ['service_id'], { name: 'ix_unit_service_service_id' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('unit_service')
  }
}
