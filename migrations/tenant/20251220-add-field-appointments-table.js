'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'customer_name', {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: 'customer_id'
    })

    await queryInterface.addIndex('appointments', ['customer_name'], {
      name: 'appointments_customer_name_idx'
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('appointments', 'appointments_customer_name_idx')
    await queryInterface.removeColumn('appointments', 'customer_name')
  }
}
