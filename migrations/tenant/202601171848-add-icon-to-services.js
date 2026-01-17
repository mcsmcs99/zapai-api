'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('services', 'icon', {
      type: Sequelize.STRING(80),
      allowNull: false,
      defaultValue: 'content_cut',
      comment: 'Material icon name (ex: content_cut, spa, restaurant)'
    })

    // (opcional) index pra facilitar filtro/relatorio por icone
    await queryInterface.addIndex('services', ['icon'], {
      name: 'services_icon_idx'
    })
  },

  async down (queryInterface, Sequelize) {
    // remove index primeiro
    await queryInterface.removeIndex('services', 'services_icon_idx')
    await queryInterface.removeColumn('services', 'icon')
  }
}
