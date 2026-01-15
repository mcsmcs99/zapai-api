'use strict';

const countryCurrencyMap = [
  { country: 'Brazil', currency: 'BRL' },
  { country: 'Portugal', currency: 'EUR' },
  { country: 'Spain', currency: 'EUR' },
  { country: 'France', currency: 'EUR' },
  { country: 'Germany', currency: 'EUR' },

  { country: 'United States', currency: 'USD' },
  { country: 'United Kingdom', currency: 'GBP' },

  { country: 'Argentina', currency: 'ARS' },
  { country: 'Mexico', currency: 'MXN' }
];

async function getIdBy (queryInterface, table, where) {
  const keys = Object.keys(where);
  const [first] = keys;
  const value = where[first];

  const [rows] = await queryInterface.sequelize.query(
    `SELECT id FROM ${table} WHERE ${first} = :value LIMIT 1`,
    { replacements: { value } }
  );

  return rows?.[0]?.id || null;
}

module.exports = {
  async up (queryInterface) {
    const now = new Date();
    const rowsToInsert = [];

    for (const item of countryCurrencyMap) {
      const countryId = await getIdBy(queryInterface, 'countries', { name: item.country });
      const currencyId = await getIdBy(queryInterface, 'currencies', { code: item.currency });

      if (!countryId || !currencyId) continue;

      rowsToInsert.push({
        country_id: countryId,
        currency_id: currencyId,
        is_default: true,
        created_at: now
      });
    }

    if (rowsToInsert.length) {
      await queryInterface.bulkInsert('country_currencies', rowsToInsert, {});
    }
  },

  async down (queryInterface) {
    for (const item of countryCurrencyMap) {
      const [countryRows] = await queryInterface.sequelize.query(
        `SELECT id FROM countries WHERE name = :name LIMIT 1`,
        { replacements: { name: item.country } }
      );
      const [currencyRows] = await queryInterface.sequelize.query(
        `SELECT id FROM currencies WHERE code = :code LIMIT 1`,
        { replacements: { code: item.currency } }
      );

      const countryId = countryRows?.[0]?.id;
      const currencyId = currencyRows?.[0]?.id;

      if (!countryId || !currencyId) continue;

      await queryInterface.bulkDelete('country_currencies', {
        country_id: countryId,
        currency_id: currencyId
      }, {});
    }
  }
};
