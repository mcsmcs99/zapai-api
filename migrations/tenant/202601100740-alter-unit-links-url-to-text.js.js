'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('unit_links', 'url', {
      type: Sequelize.TEXT, // ou Sequelize.TEXT('long')
      allowNull: false,
      comment: 'Full external URL'
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('unit_links', 'url', {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: 'Full external URL'
    })
  }
}
