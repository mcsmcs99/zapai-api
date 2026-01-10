'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * TABLE: unit_links
     * Stores external and dynamic links related to a unit.
     * Avoids adding many nullable URL columns to units table.
     */
    await queryInterface.createTable('unit_links', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Primary key'
      },

      unit_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        comment: 'Foreign key referencing units.id'
      },

      type: {
        type: Sequelize.STRING(40),
        allowNull: false,
        comment:
          'Logical link type (e.g., google_maps, waze, ride_hailing, website, instagram)'
      },

      provider: {
        type: Sequelize.STRING(40),
        allowNull: true,
        comment:
          'Optional provider identifier (e.g., uber, bolt, 99, grab). Useful for ride-hailing or multiple providers'
      },

      url: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Full external URL'
      },

      label: {
        type: Sequelize.STRING(80),
        allowNull: true,
        comment: 'Optional human-readable label for UI (e.g., "Open in Maps")'
      },

      is_primary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indicates if this is the primary link of its type'
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        comment: 'Creation timestamp'
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        comment: 'Last update timestamp'
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp (NULL means not deleted)'
      }
    })

    // FK constraint (kept explicit so it is clear and consistent)
    await queryInterface.addConstraint('unit_links', {
      fields: ['unit_id'],
      type: 'foreign key',
      name: 'unit_links_unit_id_fk',
      references: {
        table: 'units',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    })

    // Indexes for unit_links
    await queryInterface.addIndex('unit_links', ['unit_id'], {
      name: 'unit_links_unit_id_idx'
    })

    await queryInterface.addIndex('unit_links', ['type'], {
      name: 'unit_links_type_idx'
    })

    await queryInterface.addIndex('unit_links', ['deleted_at'], {
      name: 'unit_links_deleted_at_idx'
    })

    // Optional: to avoid duplicates like two "google_maps" marked as primary for same unit
    await queryInterface.addIndex('unit_links', ['unit_id', 'type', 'is_primary'], {
      name: 'unit_links_unit_type_primary_idx'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('unit_links')
  }
}
