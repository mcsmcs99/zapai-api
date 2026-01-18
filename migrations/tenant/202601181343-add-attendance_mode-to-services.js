'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('services', 'attendance_mode', {
      type: Sequelize.ENUM('fixed', 'client_location', 'mixed'),
      allowNull: false,
      defaultValue: 'fixed',
      comment: 'Defines where this service can be scheduled: fixed(unit), client_location(home), or mixed(both)'
    })

    // index pra facilitar filtro por tipo de atendimento
    await queryInterface.addIndex('services', ['attendance_mode'], {
      name: 'services_attendance_mode_idx'
    })
  },

  async down (queryInterface, Sequelize) {
    // remove index primeiro
    await queryInterface.removeIndex('services', 'services_attendance_mode_idx')
    await queryInterface.removeColumn('services', 'attendance_mode')
  }
}
