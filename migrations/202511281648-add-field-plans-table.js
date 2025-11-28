'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('plans', 'plans_payment_methods', {
      type: Sequelize.JSON,   // campo JSON
      allowNull: true         // deixa nulo pra não tretar com default em alguns bancos
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('plans', 'plans_payment_methods');
  }
};
