// models/tenant/appointment.js
'use strict'

module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define('Appointment', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    unique_key: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true
    },
    service_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    collaborator_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    start: {
      type: DataTypes.STRING(5),
      allowNull: false
    },
    end: {
      type: DataTypes.STRING(5),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'done', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'appointments',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  })

  Appointment.associate = (models) => {
    // Appointment -> Service
    if (models.Service) {
      Appointment.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' })
    }

    // Appointment -> Staff
    if (models.Staff) {
      Appointment.belongsTo(models.Staff, { foreignKey: 'collaborator_id', as: 'collaborator' })
    }
  }

  return Appointment
}
