'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const { v4: uuidv4 } = await import('uuid');
    const now = new Date();

    const rows = [
      {
        id: 1,
        unique_key : uuidv4(),
        name       : 'Plano Básico',
        price      : 0,
        status     : 'active',
        assistants : 3,
        messages   : 500,
        plans_payment_methods: JSON.stringify({
          credit_card: true,
          pix: false,
          billet: false
        }),
        created_by : null,
        created_at : now,
        updated_by : null,
        updated_at : now,
        deleted_by : null,
        deleted_at : null
      },
      {
        id: 2,
        unique_key : uuidv4(),
        name       : 'Plano Profissional',
        price      : 49.9,
        status     : 'active',
        assistants : 5,
        messages   : 1000,
        plans_payment_methods: JSON.stringify({
          credit_card: true,
          pix: true,
          billet: true
        }),
        created_by : null,
        created_at : now,
        updated_by : null,
        updated_at : now,
        deleted_by : null,
        deleted_at : null
      },
      {
        id: 3,
        unique_key : uuidv4(),
        name       : 'Plano Enterprise',
        price      : 99.9,
        status     : 'active',
        assistants : 10,
        messages   : 2500,
        plans_payment_methods: JSON.stringify({
          credit_card: true,
          pix: true,
          billet: true
        }),
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
