// controllers/tenant/staff.controller.js
'use strict'

const { Sequelize, DataTypes, Op } = require('sequelize')
const { randomUUID } = require('crypto')

const defineStaffModel = require('../../models/tenant/staff')
const defineServiceStaffModel = require('../../models/tenant/service_staff')

// --- helper para obter conexão dinâmica ------------------------------------
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
 * Cria a conexão + models ligados ao tenant
 */
async function getTenantModels (groupId) {
  const sequelize = await getTenantSequelize(groupId)
  const Staff = defineStaffModel(sequelize, DataTypes)
  const ServiceStaff = defineServiceStaffModel(sequelize, DataTypes)
  return { sequelize, Staff, ServiceStaff }
}

function parseIds (raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(Number).filter(n => Number.isFinite(n))

  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []
    try {
      const j = JSON.parse(s)
      if (Array.isArray(j)) return j.map(Number).filter(n => Number.isFinite(n))
    } catch (_) {}
    return s
      .split(',')
      .map(x => Number(String(x).trim()))
      .filter(n => Number.isFinite(n))
  }

  return []
}

// ✅ normaliza o tipo de atendimento do colaborador
function normalizeAttendanceMode (raw) {
  const v = String(raw || '').trim()
  if (v === 'fixed' || v === 'client_location' || v === 'mixed') return v
  return 'fixed'
}

async function loadServiceIds (ServiceStaff, staffId, transaction) {
  const rows = await ServiceStaff.findAll({
    where: { staff_id: staffId },
    attributes: ['service_id'],
    transaction
  })

  return rows.map(r => Number(r.service_id)).filter(n => Number.isFinite(n))
}

async function syncStaffServices (ServiceStaff, staffId, serviceIds, transaction) {
  await ServiceStaff.destroy({
    where: { staff_id: staffId },
    transaction
  })

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) return

  const ids = [...new Set(serviceIds.map(Number))].filter(n => Number.isFinite(n))
  if (!ids.length) return

  await ServiceStaff.bulkCreate(
    ids.map(serviceId => ({
      staff_id: staffId,
      service_id: serviceId,
      status: 1
    })),
    { transaction }
  )
}

function mapStaffOut (row, serviceIds = []) {
  const plain = row?.toJSON ? row.toJSON() : row
  return {
    ...plain,
    attendance_mode: normalizeAttendanceMode(plain?.attendance_mode),
    serviceIds
  }
}

// --------------------------------------------------------------------------
// Normalização/validação de schedule com unit_id por intervalo
// - regra: se attendance_mode === 'client_location', unit_id NÃO é obrigatório
// --------------------------------------------------------------------------
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function normalizeSchedule (rawSchedule, attendanceMode = 'fixed') {
  const src = rawSchedule || {}
  const out = {}

  for (const key of DAY_KEYS) {
    const v = src[key]

    // formato novo
    if (v && typeof v === 'object' && 'closed' in v && Array.isArray(v.intervals)) {
      out[key] = {
        closed: !!v.closed,
        intervals: v.intervals.map(it => ({
          start: it?.start ?? null,
          end: it?.end ?? null,
          // domiciliar: unit_id não faz sentido -> força null
          unit_id: attendanceMode === 'client_location'
            ? null
            : (it?.unit_id != null ? Number(it.unit_id) : null)
        }))
      }
      continue
    }

    // formato antigo string
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (!trimmed || trimmed.toLowerCase() === 'fechado') {
        out[key] = { closed: true, intervals: [] }
        continue
      }

      const intervals = trimmed
        .split(',')
        .map(s => s.trim())
        .map(seg => {
          const [start, end] = seg.split('-').map(t => t.trim())
          if (!start || !end) return null
          return { start, end, unit_id: null }
        })
        .filter(Boolean)

      out[key] = {
        closed: intervals.length === 0,
        intervals: intervals.map(it => ({
          ...it,
          unit_id: attendanceMode === 'client_location' ? null : it.unit_id
        }))
      }
      continue
    }

    // default
    out[key] = { closed: true, intervals: [] }
  }

  return out
}

/**
 * Valida:
 * - se closed = false, intervalos precisam ter start/end válidos
 * - unit_id obrigatório APENAS se attendanceMode !== 'client_location'
 * - sem sobreposição
 */
function validateSchedule (schedule, attendanceMode = 'fixed') {
  if (!schedule || typeof schedule !== 'object') return

  for (const key of DAY_KEYS) {
    const day = schedule[key]
    if (!day || day.closed) continue

    const intervals = Array.isArray(day.intervals) ? day.intervals : []

    for (const it of intervals) {
      const start = it?.start ?? null
      const end = it?.end ?? null

      if (!start || !end || start >= end) {
        const e = new Error(`Invalid schedule interval on ${key}. Check start/end.`)
        e.statusCode = 400
        throw e
      }

      if (attendanceMode !== 'client_location') {
        const unitIdNum = Number(it?.unit_id)
        if (!Number.isFinite(unitIdNum) || unitIdNum <= 0) {
          const e = new Error(`Missing unit_id on ${key} interval (${start}-${end}).`)
          e.statusCode = 400
          throw e
        }
      }
    }

    // valida sobreposição
    const sorted = [...intervals].sort((a, b) =>
      String(a.start || '').localeCompare(String(b.start || ''))
    )
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      if (cur.start < prev.end) {
        const e = new Error(`Overlapping intervals on ${key}.`)
        e.statusCode = 400
        throw e
      }
    }
  }
}

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------
module.exports = {
  /**
   * GET /staff
   */
  async list (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Staff, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const page = Number(req.query.page || 1)
      const limit = Number(req.query.limit || 20)
      const offset = (page - 1) * limit

      const status = req.query.status
      const search = req.query.search

      const where = {}

      if (status) where.status = status

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { role: { [Op.like]: `%${search}%` } }
        ]
      }

      const { count, rows } = await Staff.findAndCountAll({
        where,
        limit,
        offset,
        order: [['name', 'ASC']]
      })

      const staffIds = rows.map(r => r.id)
      let relMap = {}

      if (staffIds.length) {
        const rels = await ServiceStaff.findAll({
          where: { staff_id: { [Op.in]: staffIds } },
          attributes: ['staff_id', 'service_id']
        })

        relMap = rels.reduce((acc, r) => {
          const stid = Number(r.staff_id)
          const sid = Number(r.service_id)
          if (!acc[stid]) acc[stid] = []
          acc[stid].push(sid)
          return acc
        }, {})
      }

      const totalPages = Math.ceil(count / limit) || 1

      return res.json({
        data: rows.map(s => mapStaffOut(s, relMap[s.id] || [])),
        meta: { total: count, page, limit, totalPages }
      })
    } catch (err) {
      console.error('Erro ao listar staff:', err)
      return res.status(500).json({
        message: 'Erro ao carregar lista de colaboradores.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * GET /staff/:id
   */
  async getById (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Staff, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id
      const staff = await Staff.findByPk(id)

      if (!staff) {
        return res.status(404).json({ message: 'Colaborador não encontrado.' })
      }

      const serviceIds = await loadServiceIds(ServiceStaff, staff.id)
      return res.json(mapStaffOut(staff, serviceIds))
    } catch (err) {
      console.error('Erro ao buscar staff por ID:', err)
      return res.status(500).json({
        message: 'Erro ao carregar dados do colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * POST /staff
   */
  async create (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const payload = req.body || {}
      const serviceIds = parseIds(payload.serviceIds || payload.service_ids)

      // ✅ attendance_mode (default fixed)
      const attendance_mode = normalizeAttendanceMode(
        payload.attendance_mode ?? payload.attendanceMode
      )

      // ✅ normaliza/valida schedule antes de salvar, condicionado ao attendance_mode
      const schedule =
        payload.schedule !== undefined
          ? normalizeSchedule(payload.schedule, attendance_mode)
          : undefined

      if (schedule !== undefined) validateSchedule(schedule, attendance_mode)

      const { sequelize: tenantSequelize, Staff, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const created = await sequelize.transaction(async (t) => {
        const newStaff = await Staff.create(
          {
            unique_key: randomUUID(),
            name: payload.name,
            role: payload.role,
            photo_url: payload.photoUrl || payload.photo_url || null,
            attendance_mode,
            schedule: schedule !== undefined ? schedule : payload.schedule,
            status: payload.status || 'active',
            created_by: userId
          },
          { transaction: t }
        )

        await syncStaffServices(ServiceStaff, newStaff.id, serviceIds, t)
        return newStaff
      })

      return res.status(201).json(mapStaffOut(created, serviceIds))
    } catch (err) {
      const statusCode = err.statusCode || 500
      console.error('Erro ao criar staff:', err)
      return res.status(statusCode).json({
        message: statusCode === 400 ? err.message : 'Erro ao criar colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * PUT /staff/:id
   */
  async update (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const id = req.params.id
      const payload = req.body || {}

      const hasServicesPatch =
        payload.serviceIds !== undefined || payload.service_ids !== undefined

      const serviceIds = hasServicesPatch
        ? parseIds(payload.serviceIds || payload.service_ids)
        : null

      // ✅ attendance_mode patch
      const hasAttendancePatch =
        payload.attendance_mode !== undefined || payload.attendanceMode !== undefined
      const attendance_mode = hasAttendancePatch
        ? normalizeAttendanceMode(payload.attendance_mode ?? payload.attendanceMode)
        : null

      // schedule patch
      const hasSchedulePatch = payload.schedule !== undefined

      const { sequelize: tenantSequelize, Staff, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const updated = await sequelize.transaction(async (t) => {
        const staff = await Staff.findByPk(id, { transaction: t })

        if (!staff) {
          const e = new Error('Colaborador não encontrado.')
          e.statusCode = 404
          throw e
        }

        // ✅ mode efetivo (o que vai valer após update)
        const effectiveMode = hasAttendancePatch
          ? attendance_mode
          : normalizeAttendanceMode(staff.attendance_mode)

        // ✅ normaliza/valida schedule condicionado ao effectiveMode
        const schedule = hasSchedulePatch
          ? normalizeSchedule(payload.schedule, effectiveMode)
          : null

        if (hasSchedulePatch) validateSchedule(schedule, effectiveMode)

        staff.name = payload.name ?? staff.name
        staff.role = payload.role ?? staff.role
        staff.photo_url = payload.photoUrl ?? payload.photo_url ?? staff.photo_url

        if (hasAttendancePatch) staff.attendance_mode = attendance_mode
        if (hasSchedulePatch) staff.schedule = schedule
        if (payload.status) staff.status = payload.status
        staff.updated_by = userId

        await staff.save({ transaction: t })
        await staff.reload({ transaction: t })

        if (hasServicesPatch) {
          await syncStaffServices(ServiceStaff, staff.id, serviceIds, t)
        }

        return staff
      })

      const outServiceIds = hasServicesPatch
        ? serviceIds
        : await loadServiceIds(
            // mesma conexão/model
            (await getTenantModels(groupId)).ServiceStaff,
            updated.id
          )

      // ⚠️ evita abrir conexão extra: usa o model da conexão atual
      // então vamos recalcular corretamente aqui:
      const finalServiceIds = hasServicesPatch
        ? serviceIds
        : await loadServiceIds((await getTenantModels(groupId)).ServiceStaff, updated.id)

      return res.json(mapStaffOut(updated, finalServiceIds || []))
    } catch (err) {
      const statusCode = err.statusCode || 500
      console.error('Erro ao atualizar staff:', err)
      return res.status(statusCode).json({
        message:
          statusCode === 404 || statusCode === 400
            ? err.message
            : 'Erro ao atualizar colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * DELETE /staff/:id
   */
  async remove (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Staff, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      await sequelize.transaction(async (t) => {
        const staff = await Staff.findByPk(id, { transaction: t })

        if (!staff) {
          const e = new Error('Colaborador não encontrado.')
          e.statusCode = 404
          throw e
        }

        staff.deleted_by = userId
        await staff.save({ transaction: t })

        await ServiceStaff.destroy({
          where: { staff_id: staff.id },
          transaction: t
        })

        await staff.destroy({ transaction: t })
      })

      return res.json({ message: 'Colaborador removido com sucesso.' })
    } catch (err) {
      const statusCode = err.statusCode || 500
      console.error('Erro ao excluir staff:', err)
      return res.status(statusCode).json({
        message: statusCode === 404 ? err.message : 'Erro ao excluir colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  }
}
