'use strict';

const currencies = [
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' }
];

module.exports = {
  async up (queryInterface) {
    const now = new Date();

    const rows = currencies.map(c => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol || null,
      status: 'active',
      created_at: now,
      updated_at: now
    }));

    await queryInterface.bulkInsert('currencies', rows, {});
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('currencies', {
      code: currencies.map(c => c.code)
    }, {});
  }
};
