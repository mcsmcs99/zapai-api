// controllers/tenant/appointments.controller.js
'use strict'

const { Sequelize, DataTypes, Op } = require('sequelize')
const { randomUUID } = require('crypto')
const defineAppointmentModel = require('../../models/tenant/appointment')

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

  const sequelize = new Sequelize(
    dbName,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
      define: { underscored: true }
    }
  )

  return sequelize
}

/**
 * Cria a conexão + model Appointment já ligado ao tenant
 */
async function getTenantModels (groupId) {
  const sequelize = await getTenantSequelize(groupId)
  const Appointment = defineAppointmentModel(sequelize, DataTypes)
  return { sequelize, Appointment }
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
  // condição de overlap: existing.start < newEnd AND existing.end > newStart
  const where = {
    date: dateISO,
    collaborator_id: Number(collaboratorId),
    status: { [Op.ne]: 'cancelled' },
    start: { [Op.lt]: end },
    end: { [Op.gt]: start }
  }

  if (ignoreId) {
    where.id = { [Op.ne]: Number(ignoreId) }
  }

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

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------
module.exports = {
  /**
   * GET /tenant/appointments
   * Lista agendamentos com paginação e filtros
   *
   * Query suportada (alinhado com o front):
   * - page, limit
   * - status
   * - search (opcional: por notes ou customer_id numérico)
   * - collaborator_id (ou collab)
   * - service_id (ou service)
   * - from, to (DD/MM/YYYY ou YYYY-MM-DD)
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

          // permite buscar por customer_id digitando número
          if (!Number.isNaN(Number(q))) {
            or.push({ customer_id: Number(q) })
          }

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
        meta: {
          total: count,
          page,
          limit,
          totalPages
        }
      })
    } catch (err) {
      console.error('Erro ao listar appointments:', err)
      return res.status(500).json({
        message: 'Erro ao carregar lista de agendamentos.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * GET /tenant/appointments/:id
   * Retorna um agendamento específico
   */
  async getById (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Appointment } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const row = await Appointment.findByPk(id)

      if (!row) {
        return res.status(404).json({ message: 'Agendamento não encontrado.' })
      }

      return res.json(row)
    } catch (err) {
      console.error('Erro ao buscar appointment por ID:', err)
      return res.status(500).json({
        message: 'Erro ao carregar dados do agendamento.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * POST /tenant/appointments
   * Cria um novo agendamento
   *
   * Body:
   * - service_id, collaborator_id, date(YYYY-MM-DD), start(HH:mm), end(HH:mm)
   * - customer_id? (opcional)
   * - price?, status?, notes?
   */
  async create (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Appointment } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const payload = req.body || {}

      // validações mínimas (customer_id NÃO é obrigatório)
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
        status: payload.status || 'pending',
        notes: payload.notes || null,
        created_by: userId
      })

      return res.status(201).json(newRow)
    } catch (err) {
      console.error('Erro ao criar appointment:', err)

      if (err.statusCode === 409) {
        return res.status(409).json({
          message: err.message,
          conflict: err.conflict
        })
      }

      return res.status(500).json({
        message: 'Erro ao criar agendamento.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * PUT /tenant/appointments/:id
   * Atualiza um agendamento existente
   *
   * PATCH também pode usar esse mesmo handler
   */
  async update (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Appointment } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id
      const payload = req.body || {}

      const row = await Appointment.findByPk(id)

      if (!row) {
        return res.status(404).json({ message: 'Agendamento não encontrado.' })
      }

      if (payload.service_id != null) row.service_id = Number(payload.service_id)
      if (payload.collaborator_id != null) row.collaborator_id = Number(payload.collaborator_id)

      if (payload.customer_id !== undefined) {
        row.customer_id = payload.customer_id ?? null
      }

      if (payload.customer_name !== undefined) {
        row.customer_name = payload.customer_name
          ? String(payload.customer_name).trim()
          : null
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

      if (payload.price != null) row.price = Number(payload.price ?? 0)

      if (payload.status) {
        row.status = payload.status
      }

      if (payload.notes !== undefined) {
        row.notes = payload.notes
      }

      row.updated_by = userId

      // status final que vai ficar no registro (se não vier, mantém o atual)
      const finalStatus = payload.status ? payload.status : row.status

      // pega os valores finais que serão salvos (se payload trouxe algo, usa payload; senão, usa row)
      const finalDate = row.date
      const finalStart = payload.start // no seu código é obrigatório
      const finalEnd = payload.end     // no seu código é obrigatório
      const finalCollaboratorId = row.collaborator_id

      if (finalStatus !== 'cancelled') {
        await assertNoScheduleConflict({
          Appointment,
          dateISO: finalDate,
          collaboratorId: finalCollaboratorId,
          start: finalStart,
          end: finalEnd,
          ignoreId: row.id
        })
      }

      await row.save()

      return res.json(row)
    } catch (err) {
      console.error('Erro ao atualizar appointment:', err)

      if (err.statusCode === 409) {
        return res.status(409).json({
          message: err.message,
          conflict: err.conflict
        })
      }

      return res.status(500).json({
        message: 'Erro ao atualizar agendamento.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * DELETE /tenant/appointments/:id
   * Remove (soft delete) um agendamento
   */
  async remove (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Appointment } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const row = await Appointment.findByPk(id)

      if (!row) {
        return res.status(404).json({ message: 'Agendamento não encontrado.' })
      }

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
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  }
}
