// controllers/tenant/services.controller.js
'use strict'

const { Sequelize, DataTypes, Op } = require('sequelize')
const { randomUUID } = require('crypto')

const defineServiceModel = require('../../models/tenant/services')
const defineServiceStaffModel = require('../../models/tenant/service_staff')
const defineUnitServiceModel = require('../../models/tenant/unit_service')

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

  const Service = defineServiceModel(sequelize, DataTypes)
  const ServiceStaff = defineServiceStaffModel(sequelize, DataTypes)
  const UnitService = defineUnitServiceModel(sequelize, DataTypes)

  return { sequelize, Service, ServiceStaff, UnitService }
}

function parseIds (raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(Number).filter(n => Number.isFinite(n))

  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []

    // tenta JSON primeiro
    try {
      const j = JSON.parse(s)
      if (Array.isArray(j)) return j.map(Number).filter(n => Number.isFinite(n))
    } catch (_) {}

    // fallback CSV
    return s
      .split(',')
      .map(x => Number(String(x).trim()))
      .filter(n => Number.isFinite(n))
  }

  return []
}

// ✅ NEW: normaliza o ícone (garante string válida e fallback)
function normalizeIcon (icon) {
  return typeof icon === 'string' && icon.trim()
    ? icon.trim()
    : 'content_cut'
}

async function loadCollaboratorIds (ServiceStaff, serviceId, transaction) {
  const rows = await ServiceStaff.findAll({
    where: { service_id: serviceId },
    attributes: ['staff_id'],
    transaction
  })

  return rows.map(r => Number(r.staff_id)).filter(n => Number.isFinite(n))
}

async function syncServiceCollaborators (
  ServiceStaff,
  serviceId,
  collaboratorIds,
  transaction
) {
  // remove vínculos antigos
  await ServiceStaff.destroy({
    where: { service_id: serviceId },
    transaction
  })

  if (!Array.isArray(collaboratorIds) || collaboratorIds.length === 0) return

  // remove duplicados e inválidos
  const ids = [...new Set(collaboratorIds.map(Number))].filter(n => Number.isFinite(n))

  if (!ids.length) return

  await ServiceStaff.bulkCreate(
    ids.map(staffId => ({
      service_id: serviceId,
      staff_id: staffId,
      status: 1
    })),
    { transaction }
  )
}

// ------------------------ UnitService helpers -------------------------------

async function loadUnitIds (UnitService, serviceId, transaction) {
  const rows = await UnitService.findAll({
    where: { service_id: serviceId },
    attributes: ['unit_id'],
    transaction
  })

  return rows.map(r => Number(r.unit_id)).filter(n => Number.isFinite(n))
}

async function syncServiceUnits (
  UnitService,
  serviceId,
  unitIds,
  transaction
) {
  await UnitService.destroy({
    where: { service_id: serviceId },
    transaction
  })

  if (!Array.isArray(unitIds) || unitIds.length === 0) return

  const ids = [...new Set(unitIds.map(Number))].filter(n => Number.isFinite(n))
  if (!ids.length) return

  await UnitService.bulkCreate(
    ids.map(unitId => ({
      service_id: serviceId,
      unit_id: unitId,
      status: 1
    })),
    { transaction }
  )
}

function mapServiceOut (row, collaboratorIds = [], unitIds = []) {
  const plain = row?.toJSON ? row.toJSON() : row
  return {
    ...plain,
    // ✅ NEW: fallback defensivo caso algum registro antigo venha sem icon
    icon: plain?.icon || 'content_cut',
    collaboratorIds,
    unitIds
  }
}

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------
module.exports = {
  /**
   * GET /services
   * Lista serviços com paginação e filtros
   */
  async list (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Service, ServiceStaff, UnitService } = await getTenantModels(groupId)
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
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ]
      }

      const { count, rows } = await Service.findAndCountAll({
        where,
        limit,
        offset,
        order: [['title', 'ASC']]
      })

      const serviceIds = rows.map(r => r.id)

      // Map de colaboradores
      let staffMap = {}
      if (serviceIds.length) {
        const rels = await ServiceStaff.findAll({
          where: { service_id: { [Op.in]: serviceIds } },
          attributes: ['service_id', 'staff_id']
        })

        staffMap = rels.reduce((acc, r) => {
          const sid = Number(r.service_id)
          const stid = Number(r.staff_id)
          if (!acc[sid]) acc[sid] = []
          acc[sid].push(stid)
          return acc
        }, {})
      }

      // Map de unidades
      let unitMap = {}
      if (serviceIds.length) {
        const rels = await UnitService.findAll({
          where: { service_id: { [Op.in]: serviceIds } },
          attributes: ['service_id', 'unit_id']
        })

        unitMap = rels.reduce((acc, r) => {
          const sid = Number(r.service_id)
          const uid = Number(r.unit_id)
          if (!acc[sid]) acc[sid] = []
          acc[sid].push(uid)
          return acc
        }, {})
      }

      const totalPages = Math.ceil(count / limit) || 1

      return res.json({
        data: rows.map(s => mapServiceOut(s, staffMap[s.id] || [], unitMap[s.id] || [])),
        meta: { total: count, page, limit, totalPages }
      })
    } catch (err) {
      console.error('Erro ao listar serviços:', err)
      return res.status(500).json({
        message: 'Erro ao carregar lista de serviços.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * GET /services/:id
   * Retorna um serviço específico
   */
  async getById (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Service, ServiceStaff, UnitService } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const service = await Service.findByPk(id)

      if (!service) {
        return res.status(404).json({ message: 'Serviço não encontrado.' })
      }

      const collaboratorIds = await loadCollaboratorIds(ServiceStaff, service.id)
      const unitIds = await loadUnitIds(UnitService, service.id)

      return res.json(mapServiceOut(service, collaboratorIds, unitIds))
    } catch (err) {
      console.error('Erro ao buscar serviço por ID:', err)
      return res.status(500).json({
        message: 'Erro ao carregar dados do serviço.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * POST /services
   * Cria um novo serviço
   */
  async create (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null
      const payload = req.body || {}

      const collaboratorIds = parseIds(payload.collaboratorIds || payload.collaborator_ids)
      const unitIds = parseIds(payload.unitIds || payload.unit_ids)

      // ✅ NEW
      const icon = normalizeIcon(payload.icon)

      const { sequelize: tenantSequelize, Service, ServiceStaff, UnitService } =
        await getTenantModels(groupId)
      sequelize = tenantSequelize

      const created = await sequelize.transaction(async (t) => {
        const newService = await Service.create(
          {
            unique_key: randomUUID(),
            title: payload.title,
            icon, // ✅ NEW
            price: payload.price ?? 0,
            duration: payload.duration ?? 30,
            description: payload.description || null,
            status: payload.status || 'active',
            created_by: userId
          },
          { transaction: t }
        )

        await syncServiceCollaborators(ServiceStaff, newService.id, collaboratorIds, t)
        await syncServiceUnits(UnitService, newService.id, unitIds, t)

        return newService
      })

      return res.status(201).json(mapServiceOut(created, collaboratorIds, unitIds))
    } catch (err) {
      console.error('Erro ao criar serviço:', err)
      return res.status(500).json({
        message: 'Erro ao criar serviço.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * PUT /services/:id
   * Atualiza um serviço existente
   */
  async update (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null
      const payload = req.body || {}

      const hasCollaboratorsPatch =
        payload.collaboratorIds !== undefined || payload.collaborator_ids !== undefined
      const hasUnitsPatch =
        payload.unitIds !== undefined || payload.unit_ids !== undefined

      const collaboratorIds = hasCollaboratorsPatch
        ? parseIds(payload.collaboratorIds || payload.collaborator_ids)
        : null

      const unitIds = hasUnitsPatch
        ? parseIds(payload.unitIds || payload.unit_ids)
        : null

      // ✅ NEW: só altera se vier no payload
      const hasIconPatch = payload.icon !== undefined
      const icon = hasIconPatch ? normalizeIcon(payload.icon) : null

      const { sequelize: tenantSequelize, Service, ServiceStaff, UnitService } =
        await getTenantModels(groupId)
      sequelize = tenantSequelize

      const updated = await sequelize.transaction(async (t) => {
        const service = await Service.findByPk(req.params.id, { transaction: t })

        if (!service) {
          const e = new Error('Serviço não encontrado.')
          e.statusCode = 404
          throw e
        }

        service.title = payload.title ?? service.title
        if (payload.price !== undefined) service.price = payload.price
        if (payload.duration !== undefined) service.duration = payload.duration
        service.description = payload.description ?? service.description
        if (payload.status) service.status = payload.status

        // ✅ NEW
        if (hasIconPatch) service.icon = icon

        service.updated_by = userId

        await service.save({ transaction: t })

        if (hasCollaboratorsPatch) {
          await syncServiceCollaborators(ServiceStaff, service.id, collaboratorIds, t)
        }

        if (hasUnitsPatch) {
          await syncServiceUnits(UnitService, service.id, unitIds, t)
        }

        return service
      })

      // Se não veio patch de algum vínculo, carrega do banco
      let outCollaboratorIds = collaboratorIds
      let outUnitIds = unitIds

      if (!hasCollaboratorsPatch || !hasUnitsPatch) {
        const { ServiceStaff: SS2, UnitService: US2 } = await getTenantModels(groupId)

        if (!hasCollaboratorsPatch) {
          outCollaboratorIds = await loadCollaboratorIds(SS2, updated.id)
        }

        if (!hasUnitsPatch) {
          outUnitIds = await loadUnitIds(US2, updated.id)
        }
      }

      return res.json(mapServiceOut(updated, outCollaboratorIds || [], outUnitIds || []))
    } catch (err) {
      const statusCode = err.statusCode || 500
      console.error('Erro ao atualizar serviço:', err)
      return res.status(statusCode).json({
        message: statusCode === 404 ? err.message : 'Erro ao atualizar serviço.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * DELETE /services/:id
   * Remove (soft delete) um serviço
   */
  async remove (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Service, ServiceStaff, UnitService } =
        await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      await sequelize.transaction(async (t) => {
        const service = await Service.findByPk(id, { transaction: t })

        if (!service) {
          const e = new Error('Serviço não encontrado.')
          e.statusCode = 404
          throw e
        }

        service.deleted_by = userId
        await service.save({ transaction: t })

        // limpa vínculos
        await ServiceStaff.destroy({ where: { service_id: service.id }, transaction: t })
        await UnitService.destroy({ where: { service_id: service.id }, transaction: t })

        await service.destroy({ transaction: t })
      })

      return res.json({ message: 'Serviço removido com sucesso.' })
    } catch (err) {
      const statusCode = err.statusCode || 500
      console.error('Erro ao excluir serviço:', err)
      return res.status(statusCode).json({
        message: statusCode === 404 ? err.message : 'Erro ao excluir serviço.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  }
}
