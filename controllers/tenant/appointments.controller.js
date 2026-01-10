// controllers/tenant/appointments.controller.js
'use strict'

const { Sequelize, DataTypes, Op } = require('sequelize')
const { randomUUID } = require('crypto')

const defineAppointmentModel = require('../../models/tenant/appointment')
const defineServiceStaffModel = require('../../models/tenant/service_staff')

// --- helper para obter conexão dinâmica ------------------------------------
/**
 * Cria uma conexão Sequelize para o banco do tenant:
 *   zapai_api_{groupId}
 *
 * Ajuste as variáveis de ambiente conforme o seu projeto.
 */
async function getTenantSequelize (groupId) {
  if (!groupId) {
    throw new Error('group_id is required to resolve tenant database.')
  }

  const dbName = `zapai_api_${groupId}`

  return new Sequelize(dbName, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    define: { underscored: true }
  })
}

/**
 * Cria a conexão + models já ligados ao tenant
 */
async function getTenantModels (groupId) {
  const sequelize = await getTenantSequelize(groupId)

  const Appointment = defineAppointmentModel(sequelize, DataTypes)
  const ServiceStaff = defineServiceStaffModel(sequelize, DataTypes)

  return { sequelize, Appointment, ServiceStaff }
}

// --- helpers ---------------------------------------------------------------

const parseBR = (s) => {
  if (!s) return null
  const [d, m, y] = String(s).split('/').map(Number)
  if (!d || !m || !y) return null
  return new Date(y, m - 1, d)
}

const toISODate = (v) => {
  // aceita "YYYY-MM-DD" ou "DD/MM/YYYY"
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = parseBR(v)
  if (!d) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

async function assertNoScheduleConflict ({
  Appointment,
  dateISO,
  collaboratorId,
  start,
  end,
  ignoreId = null
}) {
  // overlap: existing.start < newEnd AND existing.end > newStart
  const where = {
    date: dateISO,
    collaborator_id: Number(collaboratorId),
    status: { [Op.ne]: 'cancelled' },
    start: { [Op.lt]: end },
    end: { [Op.gt]: start }
  }

  if (ignoreId) where.id = { [Op.ne]: Number(ignoreId) }

  const conflict = await Appointment.findOne({
    where,
    attributes: ['id', 'date', 'start', 'end', 'status', 'service_id', 'collaborator_id'],
    order: [['id', 'DESC']]
  })

  if (conflict) {
    const err = new Error(
      `Conflito de agenda: colaborador já possui agendamento entre ${conflict.start} e ${conflict.end} em ${conflict.date}.`
    )
    err.statusCode = 409
    err.conflict = conflict
    throw err
  }
}

/**
 * ✅ Nova regra: colaborador só pode ser agendado se existir vínculo na pivot service_staff
 * (status=1 ativo). Isso substitui o antigo "collaborator_ids" no service.
 */
async function assertCollaboratorCanDoService ({
  ServiceStaff,
  serviceId,
  staffId,
  transaction
}) {
  const sid = Number(serviceId)
  const stid = Number(staffId)

  if (!sid) {
    const err = new Error('service_id é obrigatório.')
    err.statusCode = 400
    throw err
  }
  if (!stid) {
    const err = new Error('collaborator_id é obrigatório.')
    err.statusCode = 400
    throw err
  }

  const link = await ServiceStaff.findOne({
    where: {
      service_id: sid,
      staff_id: stid,
      status: 1
    },
    attributes: ['service_id', 'staff_id', 'status'],
    transaction
  })

  if (!link) {
    const err = new Error('Este colaborador não está vinculado a este serviço.')
    err.statusCode = 400
    throw err
  }
}

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------
module.exports = {
  /**
   * GET /tenant/appointments
   */
  async list (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Appointment } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const page = Number(req.query.page || 1)
      const limit = Number(req.query.limit || 20)
      const offset = (page - 1) * limit

      const status = req.query.status
      const search = req.query.search || req.query.q
      const collab = req.query.collab || req.query.collaborator_id
      const service = req.query.service || req.query.service_id

      const fromISO = toISODate(req.query.from)
      const toISO = toISODate(req.query.to)

      const where = {}

      if (status) where.status = status
      if (collab) where.collaborator_id = Number(collab)
      if (service) where.service_id = Number(service)

      if (fromISO || toISO) {
        where.date = {}
        if (fromISO) where.date[Op.gte] = fromISO
        if (toISO) where.date[Op.lte] = toISO
      }

      if (search) {
        const q = String(search).trim()
        if (q) {
          const or = [{ notes: { [Op.like]: `%${q}%` } }]
          if (!Number.isNaN(Number(q))) or.push({ customer_id: Number(q) })
          where[Op.or] = or
        }
      }

      const { count, rows } = await Appointment.findAndCountAll({
        where,
        limit,
        offset,
        order: [['date', 'ASC'], ['start', 'ASC']]
      })

      const totalPages = Math.ceil(count / limit) || 1

      return res.json({
        data: rows,
        meta: { total: count, page, limit, totalPages }
      })
    } catch (err) {
      console.error('Erro ao listar appointments:', err)
      return res.status(500).json({
        message: 'Erro ao carregar lista de agendamentos.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * GET /tenant/appointments/:id
   */
  async getById (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Appointment } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const row = await Appointment.findByPk(req.params.id)

      if (!row) return res.status(404).json({ message: 'Agendamento não encontrado.' })

      return res.json(row)
    } catch (err) {
      console.error('Erro ao buscar appointment por ID:', err)
      return res.status(500).json({
        message: 'Erro ao carregar dados do agendamento.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * POST /tenant/appointments
   */
  async create (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Appointment, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const payload = req.body || {}

      if (!payload.service_id) {
        return res.status(400).json({ message: 'service_id é obrigatório.' })
      }
      if (!payload.collaborator_id) {
        return res.status(400).json({ message: 'collaborator_id é obrigatório.' })
      }

      const dateISO = toISODate(payload.date)
      if (!dateISO) {
        return res.status(400).json({ message: 'date inválido. Use YYYY-MM-DD (ou DD/MM/YYYY).' })
      }

      if (!payload.start || !/^\d{2}:\d{2}$/.test(payload.start)) {
        return res.status(400).json({ message: 'start inválido. Use HH:mm.' })
      }
      if (!payload.end || !/^\d{2}:\d{2}$/.test(payload.end)) {
        return res.status(400).json({ message: 'end inválido. Use HH:mm.' })
      }

      // ✅ valida vínculo na pivot
      await assertCollaboratorCanDoService({
        ServiceStaff,
        serviceId: payload.service_id,
        staffId: payload.collaborator_id
      })

      const statusToSave = payload.status || 'pending'

      if (statusToSave !== 'cancelled') {
        await assertNoScheduleConflict({
          Appointment,
          dateISO,
          collaboratorId: payload.collaborator_id,
          start: payload.start,
          end: payload.end
        })
      }

      const newRow = await Appointment.create({
        unique_key: randomUUID(),
        service_id: Number(payload.service_id),
        collaborator_id: Number(payload.collaborator_id),

        customer_id: payload.customer_id ?? null,
        customer_name: payload.customer_name ? String(payload.customer_name).trim() : null,

        date: dateISO,
        start: payload.start,
        end: payload.end,
        price: payload.price ?? 0,
        status: statusToSave,
        notes: payload.notes || null,
        created_by: userId
      })

      return res.status(201).json(newRow)
    } catch (err) {
      console.error('Erro ao criar appointment:', err)

      const statusCode = err.statusCode || 500

      if (statusCode === 409) {
        return res.status(409).json({ message: err.message, conflict: err.conflict })
      }

      if (statusCode === 400 || statusCode === 404) {
        return res.status(statusCode).json({ message: err.message })
      }

      return res.status(500).json({
        message: 'Erro ao criar agendamento.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * PUT /tenant/appointments/:id
   */
  async update (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Appointment, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const payload = req.body || {}

      const row = await Appointment.findByPk(req.params.id)
      if (!row) return res.status(404).json({ message: 'Agendamento não encontrado.' })

      // atualiza campos
      if (payload.service_id != null) row.service_id = Number(payload.service_id)
      if (payload.collaborator_id != null) row.collaborator_id = Number(payload.collaborator_id)

      // ✅ valida vínculo na pivot com os valores finais
      await assertCollaboratorCanDoService({
        ServiceStaff,
        serviceId: row.service_id,
        staffId: row.collaborator_id
      })

      if (payload.customer_id !== undefined) row.customer_id = payload.customer_id ?? null
      if (payload.customer_name !== undefined) {
        row.customer_name = payload.customer_name ? String(payload.customer_name).trim() : null
      }

      if (payload.date) {
        const dateISO = toISODate(payload.date)
        if (!dateISO) {
          return res.status(400).json({ message: 'date inválido. Use YYYY-MM-DD (ou DD/MM/YYYY).' })
        }
        row.date = dateISO
      }

      if (!payload.start || !/^\d{2}:\d{2}$/.test(payload.start)) {
        return res.status(400).json({ message: 'start inválido. Use HH:mm.' })
      }
      if (!payload.end || !/^\d{2}:\d{2}$/.test(payload.end)) {
        return res.status(400).json({ message: 'end inválido. Use HH:mm.' })
      }

      row.start = payload.start
      row.end = payload.end

      if (payload.price != null) row.price = Number(payload.price ?? 0)
      if (payload.status) row.status = payload.status
      if (payload.notes !== undefined) row.notes = payload.notes

      row.updated_by = userId

      if (row.status !== 'cancelled') {
        await assertNoScheduleConflict({
          Appointment,
          dateISO: row.date,
          collaboratorId: row.collaborator_id,
          start: row.start,
          end: row.end,
          ignoreId: row.id
        })
      }

      await row.save({
        fields: [
          'service_id',
          'collaborator_id',
          'customer_id',
          'customer_name',
          'date',
          'start',
          'end',
          'price',
          'status',
          'notes',
          'updated_by'
        ]
      })

      await row.reload()
      return res.json(row)
    } catch (err) {
      console.error('Erro ao atualizar appointment:', err)

      const statusCode = err.statusCode || 500

      if (statusCode === 409) {
        return res.status(409).json({ message: err.message, conflict: err.conflict })
      }

      if (statusCode === 400 || statusCode === 404) {
        return res.status(statusCode).json({ message: err.message })
      }

      return res.status(500).json({
        message: 'Erro ao atualizar agendamento.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * DELETE /tenant/appointments/:id
   */
  async remove (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Appointment } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const row = await Appointment.findByPk(req.params.id)
      if (!row) return res.status(404).json({ message: 'Agendamento não encontrado.' })

      row.deleted_by = userId
      await row.save()
      await row.destroy()

      return res.json({ message: 'Agendamento removido com sucesso.' })
    } catch (err) {
      console.error('Erro ao excluir appointment:', err)
      return res.status(500).json({
        message: 'Erro ao excluir agendamento.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  }
}
