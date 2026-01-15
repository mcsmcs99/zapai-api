'use strict';

const countryLocaleMap = [
  { country: 'Brazil', locale: 'pt-BR' },
  { country: 'Portugal', locale: 'pt-PT' },

  { country: 'United States', locale: 'en-US' },
  { country: 'United Kingdom', locale: 'en-GB' },

  { country: 'Spain', locale: 'es-ES' },
  { country: 'Argentina', locale: 'es-AR' },
  { country: 'Mexico', locale: 'es-MX' },

  { country: 'France', locale: 'fr-FR' },
  { country: 'Germany', locale: 'de-DE' }
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

    for (const item of countryLocaleMap) {
      const countryId = await getIdBy(queryInterface, 'countries', { name: item.country });
      const localeId = await getIdBy(queryInterface, 'locales', { code: item.locale });

      if (!countryId || !localeId) continue;

      rowsToInsert.push({
        country_id: countryId,
        locale_id: localeId,
        is_default: true,
        created_at: now
      });
    }

    if (rowsToInsert.length) {
      await queryInterface.bulkInsert('country_locales', rowsToInsert, {});
    }
  },

  async down (queryInterface) {
    // remove só os vínculos que criamos
    for (const item of countryLocaleMap) {
      const [countryRows] = await queryInterface.sequelize.query(
        `SELECT id FROM countries WHERE name = :name LIMIT 1`,
        { replacements: { name: item.country } }
      );
      const [localeRows] = await queryInterface.sequelize.query(
        `SELECT id FROM locales WHERE code = :code LIMIT 1`,
        { replacements: { code: item.locale } }
      );

      const countryId = countryRows?.[0]?.id;
      const localeId = localeRows?.[0]?.id;

      if (!countryId || !localeId) continue;

      await queryInterface.bulkDelete('country_locales', {
        country_id: countryId,
        locale_id: localeId
      }, {});
    }
  }
};
