'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // Países suportados pelos locales do seed
    const supportedCountryNames = [
      'Brazil',
      'Portugal',
      'United States',
      'United Kingdom',
      'Spain',
      'Argentina',
      'Mexico',
      'France',
      'Germany'
    ];

    // 1) Inativa todos os que NÃO estão na lista
    await queryInterface.bulkUpdate(
      'countries',
      { status: 'inactive', updated_at: now },
      {
        name: { [Sequelize.Op.notIn]: supportedCountryNames }
      }
    );

    // 2) Garante que os suportados fiquem ativos (caso algum já estivesse inactive)
    await queryInterface.bulkUpdate(
      'countries',
      { status: 'active', updated_at: now },
      {
        name: { [Sequelize.Op.in]: supportedCountryNames }
      }
    );
  },

  async down (queryInterface /*, Sequelize */) {
    const now = new Date();

    // Reverte: deixa tudo active novamente
    await queryInterface.bulkUpdate(
      'countries',
      { status: 'active', updated_at: now },
      {}
    );
  }
};
