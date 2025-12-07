// controllers/tenant/staff.controller.js
'use strict'

const { Sequelize, DataTypes, Op } = require('sequelize')
const { randomUUID } = require('crypto')
const defineStaffModel = require('../../models/tenant/staff')

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
 * Cria a conexão + model Staff já ligado ao tenant
 */
async function getTenantModels (groupId) {
  const sequelize = await getTenantSequelize(groupId)
  const Staff = defineStaffModel(sequelize, DataTypes)
  return { sequelize, Staff }
}

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------
module.exports = {
  /**
   * GET /staff
   * Lista colaboradores com paginação e filtros
   */
  async list (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Staff } = await getTenantModels(groupId)
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
      console.error('Erro ao listar staff:', err)
      return res.status(500).json({
        message: 'Erro ao carregar lista de colaboradores.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * GET /staff/:id
   * Retorna um colaborador específico
   */
  async getById (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Staff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const staff = await Staff.findByPk(id)

      if (!staff) {
        return res.status(404).json({ message: 'Colaborador não encontrado.' })
      }

      return res.json(staff)
    } catch (err) {
      console.error('Erro ao buscar staff por ID:', err)
      return res.status(500).json({
        message: 'Erro ao carregar dados do colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * POST /staff
   * Cria um novo colaborador
   */
  async create (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Staff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const payload = req.body || {}

      // campos principais
      const newStaff = await Staff.create({
        unique_key: randomUUID(),
        name: payload.name,
        role: payload.role,
        photo_url: payload.photoUrl || payload.photo_url || null,
        schedule: payload.schedule,
        status: payload.status || 'active',
        created_by: userId
      })

      return res.status(201).json(newStaff)
    } catch (err) {
      console.error('Erro ao criar staff:', err)
      return res.status(500).json({
        message: 'Erro ao criar colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * PUT /staff/:id
   * Atualiza um colaborador existente
   */
  async update (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Staff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id
      const payload = req.body || {}

      const staff = await Staff.findByPk(id)

      if (!staff) {
        return res.status(404).json({ message: 'Colaborador não encontrado.' })
      }

      staff.name = payload.name ?? staff.name
      staff.role = payload.role ?? staff.role
      staff.photo_url = payload.photoUrl ?? payload.photo_url ?? staff.photo_url
      if (payload.schedule) {
        staff.schedule = payload.schedule
      }
      if (payload.status) {
        staff.status = payload.status
      }
      staff.updated_by = userId

      await staff.save()

      return res.json(staff)
    } catch (err) {
      console.error('Erro ao atualizar staff:', err)
      return res.status(500).json({
        message: 'Erro ao atualizar colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  },

  /**
   * DELETE /staff/:id
   * Remove (soft delete) um colaborador
   */
  async remove (req, res, next) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Staff } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const staff = await Staff.findByPk(id)

      if (!staff) {
        return res.status(404).json({ message: 'Colaborador não encontrado.' })
      }

      // marca quem deletou
      staff.deleted_by = userId
      await staff.save()

      // paranoid: true -> soft delete
      await staff.destroy()

      return res.json({ message: 'Colaborador removido com sucesso.' })
    } catch (err) {
      console.error('Erro ao excluir staff:', err)
      return res.status(500).json({
        message: 'Erro ao excluir colaborador.',
        error: err.message
      })
    } finally {
      if (sequelize) {
        await sequelize.close().catch(() => {})
      }
    }
  }
}
