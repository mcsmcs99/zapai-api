'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    // ✅ adiciona unit_id ANTES de service_id
    await queryInterface.addColumn('appointments', 'unit_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      after: 'unique_key' // fica antes do service_id
    })

    // FK (dentro do tenant DB)
    await queryInterface.addConstraint('appointments', {
      fields: ['unit_id'],
      type: 'foreign key',
      name: 'appointments_unit_id_fk',
      references: { table: 'units', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    })

    // Índice (filtro por unidade)
    await queryInterface.addIndex('appointments', ['unit_id'], {
      name: 'appointments_unit_id_idx'
    })

    // (Opcional, mas recomendado) índice composto pra agenda por unidade/colaborador/dia
    await queryInterface.addIndex('appointments', ['unit_id', 'collaborator_id', 'date'], {
      name: 'appointments_unit_collaborator_date_idx'
    })
  },

  async down (queryInterface, Sequelize) {
    // remove índice composto (se existir)
    await queryInterface.removeIndex('appointments', 'appointments_unit_collaborator_date_idx').catch(() => {})

    // remove índice unit
    await queryInterface.removeIndex('appointments', 'appointments_unit_id_idx').catch(() => {})

    // remove FK
    await queryInterface.removeConstraint('appointments', 'appointments_unit_id_fk').catch(() => {})

    // remove coluna
    await queryInterface.removeColumn('appointments', 'unit_id')
  }
}
