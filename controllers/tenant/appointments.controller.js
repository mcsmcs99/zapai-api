// controllers/tenant/appointments.controller.js
'use strict'

const { Sequelize, DataTypes, Op } = require('sequelize')
const { randomUUID } = require('crypto')

const defineAppointmentModel = require('../../models/tenant/appointment')
const defineServiceStaffModel = require('../../models/tenant/service_staff')
const defineStaffModel = require('../../models/tenant/staff')
const defineUnitServiceModel = require('../../models/tenant/unit_service')

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
  const Staff = defineStaffModel(sequelize, DataTypes)
  const UnitService = defineUnitServiceModel(sequelize, DataTypes)

  return { sequelize, Appointment, ServiceStaff, Staff, UnitService }
}

// --- helpers ---------------------------------------------------------------

const parseBR = (s) => {
  if (!s) return null
  const [d, m, y] = String(s).split('/').map(Number)
  if (!d || !m || !y) return null
  return new Date(y, m - 1, d)
}

const toISODate = (v) => {
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = parseBR(v)
  if (!d) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const weekdayKeyFromISO = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[d.getDay()]
}

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number)
  return (h * 60) + (m || 0)
}

function isValidTime (t) {
  return typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)
}

/**
 * Valida:
 * - collaborator tem schedule no dia
 * - o start/end está dentro de algum intervalo
 * - e esse intervalo tem unit_id que bate com o unit_id do agendamento
 */
function assertTimeWithinStaffScheduleUnit ({ schedule, dateISO, start, end, unitId }) {
  const dayKey = weekdayKeyFromISO(dateISO)
  const day = schedule?.[dayKey]
  if (!day || day.closed) {
    const e = new Error('Colaborador não atende no dia selecionado.')
    e.statusCode = 400
    throw e
  }

  const startMin = toMin(start)
  const endMin = toMin(end)

  const intervals = Array.isArray(day.intervals) ? day.intervals : []

  const ok = intervals.some(it => {
    const itStart = it?.start
    const itEnd = it?.end
    const itUnit = Number(it?.unit_id)
    if (!isValidTime(itStart) || !isValidTime(itEnd)) return false
    if (!Number.isFinite(itUnit) || itUnit <= 0) return false

    const itStartMin = toMin(itStart)
    const itEndMin = toMin(itEnd)

    // dentro do intervalo
    const inside = startMin >= itStartMin && endMin <= itEndMin
    if (!inside) return false

    // e mesma unidade
    return Number(unitId) === itUnit
  })

  if (!ok) {
    const e = new Error('Horário selecionado não está disponível para este colaborador nesta unidade.')
    e.statusCode = 400
    throw e
  }
}

async function assertNoScheduleConflict ({
  Appointment,
  dateISO,
  collaboratorId,
  start,
  end,
  ignoreId = null,
  unitId = null // ✅ agora conflita por unidade + colaborador + dia
}) {
  const where = {
    date: dateISO,
    collaborator_id: Number(collaboratorId),
    status: { [Op.ne]: 'cancelled' },
    start: { [Op.lt]: end },
    end: { [Op.gt]: start }
  }

  // ✅ se você quer impedir conflito entre unidades diferentes do mesmo colaborador,
  // remova este filtro. Mas como agora o staff tem schedule por unidade, o mais coerente
  // é conflito ser GLOBAL do colaborador (sem unit). Você escolhe.
  // Aqui vou MANTER global (não filtra por unit_id), porque o colaborador não consegue estar em 2 lugares.
  // if (unitId) where.unit_id = Number(unitId)

  if (ignoreId) where.id = { [Op.ne]: Number(ignoreId) }

  const conflict = await Appointment.findOne({
    where,
    attributes: ['id', 'date', 'start', 'end', 'status', 'service_id', 'collaborator_id', 'unit_id'],
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
 * Colaborador só pode ser agendado se existir vínculo na pivot service_staff (status=1).
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

/**
 * ✅ Serviço deve estar ativo na unidade (pivot unit_service status=1)
 */
async function assertServiceAvailableInUnit ({
  UnitService,
  unitId,
  serviceId,
  transaction
}) {
  const uid = Number(unitId)
  const sid = Number(serviceId)

  if (!uid) {
    const err = new Error('unit_id é obrigatório.')
    err.statusCode = 400
    throw err
  }
  if (!sid) {
    const err = new Error('service_id é obrigatório.')
    err.statusCode = 400
    throw err
  }

  const link = await UnitService.findOne({
    where: {
      unit_id: uid,
      service_id: sid,
      status: 1
    },
    attributes: ['unit_id', 'service_id', 'status'],
    transaction
  })

  if (!link) {
    const err = new Error('Este serviço não está disponível na unidade selecionada.')
    err.statusCode = 400
    throw err
  }
}

/**
 * ✅ carrega staff.schedule do banco e valida unidade/horário
 */
async function assertStaffScheduleMatchesUnitAndTime ({
  Staff,
  staffId,
  dateISO,
  start,
  end,
  unitId,
  transaction
}) {
  const row = await Staff.findByPk(Number(staffId), {
    attributes: ['id', 'schedule', 'status'],
    transaction
  })

  if (!row) {
    const e = new Error('Colaborador não encontrado.')
    e.statusCode = 404
    throw e
  }

  if (row.status && String(row.status) !== 'active') {
    const e = new Error('Colaborador inativo.')
    e.statusCode = 400
    throw e
  }

  // schedule pode vir string JSON ou objeto (depende do model)
  let schedule = row.schedule
  if (typeof schedule === 'string') {
    try { schedule = JSON.parse(schedule) } catch (_) {}
  }

  assertTimeWithinStaffScheduleUnit({
    schedule,
    dateISO,
    start,
    end,
    unitId
  })
}

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------
module.exports = {
  /**
   * GET /tenant/appointments/conflicts
   */
  async conflicts (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Appointment } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const collaboratorId = Number(req.query.collaborator_id || req.query.collab || 0)
      if (!Number.isFinite(collaboratorId) || collaboratorId <= 0) {
        return res.status(400).json({ message: 'collaborator_id é obrigatório.' })
      }

      const dateISO = toISODate(req.query.date)
      if (!dateISO) {
        return res.status(400).json({ message: 'date inválido. Use YYYY-MM-DD (ou DD/MM/YYYY).' })
      }

      const excludeId = Number(req.query.exclude_id || 0) || null
      const includeCancelled = String(req.query.include_cancelled || '').toLowerCase() === 'true'

      const start = req.query.start
      const end = req.query.end
      const hasTimeRange = isValidTime(start) && isValidTime(end)

      const where = {
        date: dateISO,
        collaborator_id: collaboratorId
      }

      if (!includeCancelled) where.status = { [Op.ne]: 'cancelled' }
      if (excludeId) where.id = { [Op.ne]: excludeId }

      if (hasTimeRange) {
        where.start = { [Op.lt]: end }
        where.end = { [Op.gt]: start }
      }

      const rows = await Appointment.findAll({
        where,
        attributes: ['id', 'date', 'start', 'end', 'status', 'service_id', 'collaborator_id', 'unit_id'],
        order: [['start', 'ASC']]
      })

      return res.json({
        data: rows,
        meta: { date: dateISO, collaborator_id: collaboratorId, count: rows.length }
      })
    } catch (err) {
      console.error('Erro ao buscar conflitos de appointments:', err)
      return res.status(500).json({
        message: 'Erro ao carregar conflitos de agendamentos.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

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
      const unit = req.query.unit || req.query.unit_id

      const fromISO = toISODate(req.query.from)
      const toISO = toISODate(req.query.to)

      const where = {}

      if (status) where.status = status
      if (collab) where.collaborator_id = Number(collab)
      if (service) where.service_id = Number(service)
      if (unit) where.unit_id = Number(unit)

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
          or.push({ customer_name: { [Op.like]: `%${q}%` } })
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

      const { sequelize: tenantSequelize, Appointment, ServiceStaff, Staff, UnitService } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const payload = req.body || {}

      const unitId = Number(payload.unit_id ?? payload.unitId ?? 0)
      const serviceId = Number(payload.service_id ?? payload.serviceId ?? 0)
      const collaboratorId = Number(payload.collaborator_id ?? payload.collaboratorId ?? 0)

      if (!Number.isFinite(unitId) || unitId <= 0) {
        return res.status(400).json({ message: 'unit_id é obrigatório.' })
      }
      if (!Number.isFinite(serviceId) || serviceId <= 0) {
        return res.status(400).json({ message: 'service_id é obrigatório.' })
      }
      if (!Number.isFinite(collaboratorId) || collaboratorId <= 0) {
        return res.status(400).json({ message: 'collaborator_id é obrigatório.' })
      }

      const dateISO = toISODate(payload.date)
      if (!dateISO) {
        return res.status(400).json({ message: 'date inválido. Use YYYY-MM-DD (ou DD/MM/YYYY).' })
      }

      if (!isValidTime(payload.start)) {
        return res.status(400).json({ message: 'start inválido. Use HH:mm.' })
      }
      if (!isValidTime(payload.end)) {
        return res.status(400).json({ message: 'end inválido. Use HH:mm.' })
      }

      const statusToSave = payload.status || 'pending'

      // ✅ valida regras antes de gravar
      await assertServiceAvailableInUnit({ UnitService, unitId, serviceId })
      await assertCollaboratorCanDoService({ ServiceStaff, serviceId, staffId: collaboratorId })
      await assertStaffScheduleMatchesUnitAndTime({
        Staff,
        staffId: collaboratorId,
        dateISO,
        start: payload.start,
        end: payload.end,
        unitId
      })

      if (statusToSave !== 'cancelled') {
        await assertNoScheduleConflict({
          Appointment,
          dateISO,
          collaboratorId,
          start: payload.start,
          end: payload.end,
          ignoreId: null,
          unitId
        })
      }

      const newRow = await Appointment.create({
        unique_key: randomUUID(),
        unit_id: unitId,
        service_id: serviceId,
        collaborator_id: collaboratorId,

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

      if (statusCode === 409) return res.status(409).json({ message: err.message, conflict: err.conflict })
      if (statusCode === 400 || statusCode === 404) return res.status(statusCode).json({ message: err.message })

      return res.status(500).json({ message: 'Erro ao criar agendamento.', error: err.message })
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

      const { sequelize: tenantSequelize, Appointment, ServiceStaff, Staff, UnitService } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const payload = req.body || {}

      const row = await Appointment.findByPk(req.params.id)
      if (!row) return res.status(404).json({ message: 'Agendamento não encontrado.' })

      // aplica campos recebidos
      if (payload.unit_id != null) row.unit_id = Number(payload.unit_id)
      if (payload.service_id != null) row.service_id = Number(payload.service_id)
      if (payload.collaborator_id != null) row.collaborator_id = Number(payload.collaborator_id)

      const unitId = Number(row.unit_id)
      const serviceId = Number(row.service_id)
      const collaboratorId = Number(row.collaborator_id)

      if (!Number.isFinite(unitId) || unitId <= 0) return res.status(400).json({ message: 'unit_id inválido.' })
      if (!Number.isFinite(serviceId) || serviceId <= 0) return res.status(400).json({ message: 'service_id inválido.' })
      if (!Number.isFinite(collaboratorId) || collaboratorId <= 0) return res.status(400).json({ message: 'collaborator_id inválido.' })

      if (payload.customer_id !== undefined) row.customer_id = payload.customer_id ?? null
      if (payload.customer_name !== undefined) row.customer_name = payload.customer_name ? String(payload.customer_name).trim() : null

      if (payload.date) {
        const dateISO = toISODate(payload.date)
        if (!dateISO) return res.status(400).json({ message: 'date inválido. Use YYYY-MM-DD (ou DD/MM/YYYY).' })
        row.date = dateISO
      }

      if (!isValidTime(payload.start)) return res.status(400).json({ message: 'start inválido. Use HH:mm.' })
      if (!isValidTime(payload.end)) return res.status(400).json({ message: 'end inválido. Use HH:mm.' })
      row.start = payload.start
      row.end = payload.end

      if (payload.price != null) row.price = Number(payload.price ?? 0)
      if (payload.status) row.status = payload.status
      if (payload.notes !== undefined) row.notes = payload.notes

      row.updated_by = userId

      // ✅ valida regras com os valores finais
      await assertServiceAvailableInUnit({ UnitService, unitId, serviceId })
      await assertCollaboratorCanDoService({ ServiceStaff, serviceId, staffId: collaboratorId })
      await assertStaffScheduleMatchesUnitAndTime({
        Staff,
        staffId: collaboratorId,
        dateISO: row.date,
        start: row.start,
        end: row.end,
        unitId
      })

      if (row.status !== 'cancelled') {
        await assertNoScheduleConflict({
          Appointment,
          dateISO: row.date,
          collaboratorId,
          start: row.start,
          end: row.end,
          ignoreId: row.id,
          unitId
        })
      }

      await row.save({
        fields: [
          'unit_id',
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

      if (statusCode === 409) return res.status(409).json({ message: err.message, conflict: err.conflict })
      if (statusCode === 400 || statusCode === 404) return res.status(statusCode).json({ message: err.message })

      return res.status(500).json({ message: 'Erro ao atualizar agendamento.', error: err.message })
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
