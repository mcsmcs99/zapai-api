'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('staff', 'attendance_mode', {
      type: Sequelize.ENUM('fixed', 'client_location', 'mixed'),
      allowNull: false,
      defaultValue: 'fixed',
      comment: 'Defines where this staff member can work: fixed(unit), client_location(home), or mixed(both)'
    })

    // index pra facilitar filtro por tipo de atendimento
    await queryInterface.addIndex('staff', ['attendance_mode'], {
      name: 'staff_attendance_mode_idx'
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('staff', 'staff_attendance_mode_idx')
    await queryInterface.removeColumn('staff', 'attendance_mode')
  }
}
