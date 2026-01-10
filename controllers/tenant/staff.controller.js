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

async function loadServiceIds (ServiceStaff, staffId, transaction) {
  const rows = await ServiceStaff.findAll({
    where: { staff_id: staffId },
    attributes: ['service_id'],
    transaction
  })

  return rows.map(r => Number(r.service_id)).filter(n => Number.isFinite(n))
}

async function syncStaffServices (ServiceStaff, staffId, serviceIds, transaction) {
  // remove vínculos antigos do colaborador
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
    serviceIds
  }
}

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------
module.exports = {
  /**
   * GET /staff
   * Lista colaboradores com paginação e filtros
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
   * Retorna um colaborador específico
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
   * Cria um novo colaborador
   *
   * Espera opcionalmente:
   *   payload.serviceIds (array)  -> serviços vinculados ao colaborador
   */
  async create (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const payload = req.body || {}
      const serviceIds = parseIds(payload.serviceIds || payload.service_ids)

      const { sequelize: tenantSequelize, Staff, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const created = await sequelize.transaction(async (t) => {
        const newStaff = await Staff.create(
          {
            unique_key: randomUUID(),
            name: payload.name,
            role: payload.role,
            photo_url: payload.photoUrl || payload.photo_url || null,
            schedule: payload.schedule,
            status: payload.status || 'active',
            created_by: userId
          },
          { transaction: t }
        )

        // sincroniza vínculos com services
        await syncStaffServices(ServiceStaff, newStaff.id, serviceIds, t)

        return newStaff
      })

      return res.status(201).json(mapStaffOut(created, serviceIds))
    } catch (err) {
      console.error('Erro ao criar staff:', err)
      return res.status(500).json({
        message: 'Erro ao criar colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * PUT /staff/:id
   * Atualiza um colaborador existente
   *
   * Se vier payload.serviceIds -> sincroniza serviços do colaborador
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

      const { sequelize: tenantSequelize, Staff, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const updated = await sequelize.transaction(async (t) => {
        const staff = await Staff.findByPk(id, { transaction: t })

        if (!staff) {
          const e = new Error('Colaborador não encontrado.')
          e.statusCode = 404
          throw e
        }

        staff.name = payload.name ?? staff.name
        staff.role = payload.role ?? staff.role
        staff.photo_url = payload.photoUrl ?? payload.photo_url ?? staff.photo_url
        if (payload.schedule) staff.schedule = payload.schedule
        if (payload.status) staff.status = payload.status
        staff.updated_by = userId

        await staff.save({ transaction: t })

        if (hasServicesPatch) {
          await syncStaffServices(ServiceStaff, staff.id, serviceIds, t)
        }

        return staff
      })

      const outServiceIds = hasServicesPatch
        ? serviceIds
        : await loadServiceIds((await getTenantModels(groupId)).ServiceStaff, updated.id)

      return res.json(mapStaffOut(updated, outServiceIds || []))
    } catch (err) {
      const statusCode = err.statusCode || 500
      console.error('Erro ao atualizar staff:', err)
      return res.status(statusCode).json({
        message: statusCode === 404 ? err.message : 'Erro ao atualizar colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * DELETE /staff/:id
   * Remove (soft delete) um colaborador
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

        // limpa vínculos (se quiser histórico, troque por status=0)
        await ServiceStaff.destroy({
          where: { staff_id: staff.id },
          transaction: t
        })

        await staff.destroy({ transaction: t }) // paranoid: true -> soft delete
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
