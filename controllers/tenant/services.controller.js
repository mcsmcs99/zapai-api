// controllers/tenant/services.controller.js
'use strict'

const { Sequelize, DataTypes, Op } = require('sequelize')
const { randomUUID } = require('crypto')
const defineServiceModel = require('../../models/tenant/services')

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
      define: {
        underscored: true
      }
    }
  )

  return sequelize
}

/**
 * Cria a conexão + model Service já ligado ao tenant
 */
async function getTenantModels (groupId) {
  const sequelize = await getTenantSequelize(groupId)
  const Service = defineServiceModel(sequelize, DataTypes)
  return { sequelize, Service }
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

function stringifyIds (arr) {
  const out = (Array.isArray(arr) ? arr : [])
    .map(Number)
    .filter(n => Number.isFinite(n))

  // remove duplicados
  return JSON.stringify([...new Set(out)])
}

function mapServiceOut (row) {
  const plain = row?.toJSON ? row.toJSON() : row
  const collaboratorIds = parseIds(plain?.collaborator_ids ?? plain?.collaboratorIds)
  // devolve padrão do front
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
  async list (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Service } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const page = Number(req.query.page || 1)
      const limit = Number(req.query.limit || 20)
      const offset = (page - 1) * limit

      const status = req.query.status
      const search = req.query.search

      const where = {}

      if (status) {
        where.status = status
      }

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

      const totalPages = Math.ceil(count / limit) || 1

      return res.json({
        data: rows.map(mapServiceOut),
        meta: {
          total: count,
          page,
          limit,
          totalPages
        }
      })
    } catch (err) {
      console.error('Erro ao listar serviços:', err)
      return res.status(500).json({
        message: 'Erro ao carregar lista de serviços.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * GET /services/:id
   * Retorna um serviço específico
   */
  async getById (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Service } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const service = await Service.findByPk(id)

      if (!service) {
        return res.status(404).json({ message: 'Serviço não encontrado.' })
      }

      return res.json(mapServiceOut(service))
    } catch (err) {
      console.error('Erro ao buscar serviço por ID:', err)
      return res.status(500).json({
        message: 'Erro ao carregar dados do serviço.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * POST /services
   * Cria um novo serviço
   */
  async create (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null
      const collaboratorIds = parseIds(payload.collaboratorIds || payload.collaborator_ids)

      const { sequelize: tenantSequelize, Service } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const payload = req.body || {}

      const newService = await Service.create({
        unique_key: randomUUID(),
        title: payload.title,
        price: payload.price ?? 0,
        duration: payload.duration ?? 30,
        description: payload.description || null,
        collaborator_ids: stringifyIds(collaboratorIds),
        status: payload.status || 'active',
        created_by: userId
      })

      return res.status(201).json(mapServiceOut(newService))
    } catch (err) {
      console.error('Erro ao criar serviço:', err)
      return res.status(500).json({
        message: 'Erro ao criar serviço.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * PUT /services/:id
   * Atualiza um serviço existente
   */
  async update (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Service } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id
      const payload = req.body || {}

      const service = await Service.findByPk(id)

      if (!service) {
        return res.status(404).json({ message: 'Serviço não encontrado.' })
      }

      service.title = payload.title ?? service.title
      if (payload.price !== undefined) {
        service.price = payload.price
      }
      if (payload.duration !== undefined) {
        service.duration = payload.duration
      }
      service.description = payload.description ?? service.description

      if (payload.collaboratorIds !== undefined || payload.collaborator_ids !== undefined) {
        const ids = parseIds(payload.collaboratorIds || payload.collaborator_ids)
        service.collaborator_ids = stringifyIds(ids)
      }

      if (payload.status) {
        service.status = payload.status
      }

      service.updated_by = userId

      await service.save()

      return res.json(mapServiceOut(service))
    } catch (err) {
      console.error('Erro ao atualizar serviço:', err)
      return res.status(500).json({
        message: 'Erro ao atualizar serviço.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * DELETE /services/:id
   * Remove (soft delete) um serviço
   */
  async remove (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Service } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const service = await Service.findByPk(id)

      if (!service) {
        return res.status(404).json({ message: 'Serviço não encontrado.' })
      }

      service.deleted_by = userId
      await service.save()

      await service.destroy() // paranoid: true -> soft delete

      return res.json({ message: 'Serviço removido com sucesso.' })
    } catch (err) {
      console.error('Erro ao excluir serviço:', err)
      return res.status(500).json({
        message: 'Erro ao excluir serviço.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  }
}
