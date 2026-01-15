'use strict';

const locales = [
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'pt-PT', name: 'Português (Portugal)' },
  { code: 'en-US', name: 'English (United States)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'es-ES', name: 'Español (España)' },
  { code: 'es-AR', name: 'Español (Argentina)' },
  { code: 'es-MX', name: 'Español (México)' },
  { code: 'fr-FR', name: 'Français (France)' },
  { code: 'de-DE', name: 'Deutsch (Deutschland)' }
];

module.exports = {
  async up (queryInterface) {
    const now = new Date();

    const rows = locales.map(l => ({
      code: l.code,
      name: l.name,
      status: 'active',
      created_at: now,
      updated_at: now
    }));

    await queryInterface.bulkInsert('locales', rows, {});
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('locales', {
      code: locales.map(l => l.code)
    }, {});
  }
};
