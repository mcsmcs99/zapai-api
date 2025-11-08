'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('locations', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      unique_key: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      address: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      number: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      complement: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      district: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      country_code: {
        type: Sequelize.STRING(5),
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      place_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Google Place ID'
      },
      google_maps_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      waze_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      uber_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      deleted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Índices
    await queryInterface.addIndex('locations', ['unique_key'], { unique: true, name: 'locations_unique_key_uindex' });
    await queryInterface.addIndex('locations', ['is_active'], { name: 'locations_is_active_idx' });
    await queryInterface.addIndex('locations', ['city'], { name: 'locations_city_idx' });
    await queryInterface.addIndex('locations', ['state'], { name: 'locations_state_idx' });
    await queryInterface.addIndex('locations', ['country_code'], { name: 'locations_country_code_idx' });
    await queryInterface.addIndex('locations', ['deleted_at'], { name: 'locations_deleted_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('locations');
  }
};
