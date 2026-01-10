// controllers/tenant/services.controller.js
'use strict'

const { Sequelize, DataTypes, Op } = require('sequelize')
const { randomUUID } = require('crypto')

const defineServiceModel = require('../../models/tenant/services')
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

  const Service = defineServiceModel(sequelize, DataTypes)
  const ServiceStaff = defineServiceStaffModel(sequelize, DataTypes)

  return { sequelize, Service, ServiceStaff }
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

function mapServiceOut (row, collaboratorIds = []) {
  const plain = row?.toJSON ? row.toJSON() : row
  return {
    ...plain,
    collaboratorIds
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
      const { sequelize: tenantSequelize, Service, ServiceStaff } = await getTenantModels(groupId)
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

      // busca collaboratorIds em lote (1 query) e monta map service_id => [staff_id...]
      const serviceIds = rows.map(r => r.id)
      let relMap = {}

      if (serviceIds.length) {
        const rels = await ServiceStaff.findAll({
          where: { service_id: { [Op.in]: serviceIds } },
          attributes: ['service_id', 'staff_id']
        })

        relMap = rels.reduce((acc, r) => {
          const sid = Number(r.service_id)
          const stid = Number(r.staff_id)
          if (!acc[sid]) acc[sid] = []
          acc[sid].push(stid)
          return acc
        }, {})
      }

      const totalPages = Math.ceil(count / limit) || 1

      return res.json({
        data: rows.map(s => mapServiceOut(s, relMap[s.id] || [])),
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
      const { sequelize: tenantSequelize, Service, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const service = await Service.findByPk(id)

      if (!service) {
        return res.status(404).json({ message: 'Serviço não encontrado.' })
      }

      const collaboratorIds = await loadCollaboratorIds(ServiceStaff, service.id)

      return res.json(mapServiceOut(service, collaboratorIds))
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

      const { sequelize: tenantSequelize, Service, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const created = await sequelize.transaction(async (t) => {
        const newService = await Service.create(
          {
            unique_key: randomUUID(),
            title: payload.title,
            price: payload.price ?? 0,
            duration: payload.duration ?? 30,
            description: payload.description || null,
            status: payload.status || 'active',
            created_by: userId
          },
          { transaction: t }
        )

        await syncServiceCollaborators(ServiceStaff, newService.id, collaboratorIds, t)

        return newService
      })

      // retorna o que o front espera
      return res.status(201).json(mapServiceOut(created, collaboratorIds))
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

      const collaboratorIds = hasCollaboratorsPatch
        ? parseIds(payload.collaboratorIds || payload.collaborator_ids)
        : null

      const { sequelize: tenantSequelize, Service, ServiceStaff } = await getTenantModels(groupId)
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
        service.updated_by = userId

        await service.save({ transaction: t })

        if (hasCollaboratorsPatch) {
          await syncServiceCollaborators(ServiceStaff, service.id, collaboratorIds, t)
        }

        return service
      })

      const outCollaboratorIds = hasCollaboratorsPatch
        ? collaboratorIds
        : await loadCollaboratorIds(
            (await getTenantModels(groupId)).ServiceStaff, // fallback: carrega depois sem transação
            updated.id
          )

      return res.json(mapServiceOut(updated, outCollaboratorIds || []))
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

      const { sequelize: tenantSequelize, Service, ServiceStaff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const deleted = await sequelize.transaction(async (t) => {
        const service = await Service.findByPk(id, { transaction: t })

        if (!service) {
          const e = new Error('Serviço não encontrado.')
          e.statusCode = 404
          throw e
        }

        service.deleted_by = userId
        await service.save({ transaction: t })

        // limpa vínculos (se quiser manter histórico, remova isso e use status=0)
        await ServiceStaff.destroy({
          where: { service_id: service.id },
          transaction: t
        })

        await service.destroy({ transaction: t }) // paranoid: true -> soft delete

        return service
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
