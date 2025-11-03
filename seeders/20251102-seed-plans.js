'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const { v4: uuidv4 } = await import('uuid');
    const now = new Date();

    const rows = [
      {
        unique_key : uuidv4(),
        name       : 'Plano Básico',
        price      : 49.9,
        status     : 'active',
        assistants : 5,
        messages   : 500,
        created_by : null,
        created_at : now,
        updated_by : null,
        updated_at : now,
        deleted_by : null,
        deleted_at : null
      },
      {
        unique_key : uuidv4(),
        name       : 'Plano Profissional',
        price      : 99.9,
        status     : 'active',
        assistants : 10,
        messages   : 2500,
        created_by : null,
        created_at : now,
        updated_by : null,
        updated_at : now,
        deleted_by : null,
        deleted_at : null
      },
      {
        unique_key : uuidv4(),
        name       : 'Plano Enterprise',
        price      : 0,
        status     : 'active',
        assistants : 1,
        messages   : 50,
        created_by : null,
        created_at : now,
        updated_by : null,
        updated_at : now,
        deleted_by : null,
        deleted_at : null
      }
    ];

    await queryInterface.bulkInsert('plans', rows, {});
  },

  async down (queryInterface /*, Sequelize */) {
    await queryInterface.bulkDelete('plans', {
      name: ['Plano Básico', 'Plano Profissional', 'Plano Enterprise']
    }, {});
  }
};
