'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * TABLE: units
     * Represents a physical business unit / branch / location.
     * Designed to be suitable for scheduling systems.
     */
    await queryInterface.createTable('units', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Primary key (internal identifier)'
      },

      unique_key: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
        comment: 'Public unique identifier (UUID), safe to expose in URLs'
      },

      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Display name of the unit (e.g., "Downtown Barber Shop")'
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },

      phone: {
        type: Sequelize.STRING(25),
        allowNull: true,
        comment: 'Contact phone number, preferably in E.164 format'
      },

      email: {
        type: Sequelize.STRING(120),
        allowNull: true,
        comment: 'Contact email address for the unit'
      },

      timezone: {
        type: Sequelize.STRING(60),
        allowNull: true,
        comment: 'IANA timezone (e.g., America/Sao_Paulo). Important for scheduling'
      },

      // ---------- Address ----------
      address_line1: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Address line 1 (street + number or street only)'
      },

      address_line2: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Address line 2 (suite, apartment, complement)'
      },

      sublocality: {
        type: Sequelize.STRING(150),
        allowNull: true,
        comment: 'Neighborhood / district / sub-locality (optional)'
      },

      locality: {
        type: Sequelize.STRING(150),
        allowNull: true,
        comment: 'City or locality name'
      },

      administrative_area: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'State / province / region'
      },

      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Postal or ZIP code'
      },

      // ---------- Geolocation / Places ----------
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitude in decimal degrees'
      },

      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitude in decimal degrees'
      },

      place_id: {
        type: Sequelize.STRING(120),
        allowNull: true,
        comment: 'External place identifier (e.g., Google Place ID)'
      },

      // ---------- Auditing / Soft delete ----------
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'User ID that created this record'
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        comment: 'Creation timestamp'
      },

      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'User ID that last updated this record'
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        comment: 'Last update timestamp'
      },

      deleted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'User ID that soft-deleted this record'
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp (NULL means active)'
      }
    })

    // Indexes
    await queryInterface.addIndex('units', ['unique_key'], {
      unique: true,
      name: 'units_unique_key_uindex'
    })

    await queryInterface.addIndex('units', ['status'], {
      name: 'units_status_idx'
    })

    await queryInterface.addIndex('units', ['locality'], {
      name: 'units_locality_idx'
    })

    await queryInterface.addIndex('units', ['administrative_area'], {
      name: 'units_administrative_area_idx'
    })

    await queryInterface.addIndex('units', ['deleted_at'], {
      name: 'units_deleted_at_idx'
    })
  },

  async down (queryInterface) {
    await queryInterface.dropTable('units')
  }
}
