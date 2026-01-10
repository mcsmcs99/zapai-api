// controllers/tenant/units.controller.js
'use strict'

const { Sequelize, DataTypes, Op } = require('sequelize')
const { randomUUID } = require('crypto')

const defineUnitModel = require('../../models/tenant/unit')
const defineUnitLinkModel = require('../../models/tenant/unit_link')

// --- helper para obter conexão dinâmica ------------------------------------
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
 * Cria a conexão + models Unit e UnitLink já ligados ao tenant
 */
async function getTenantModels (groupId) {
  const sequelize = await getTenantSequelize(groupId)

  const Unit = defineUnitModel(sequelize, DataTypes)
  const UnitLink = defineUnitLinkModel(sequelize, DataTypes)

  // garante associações (caso você use Unit.associate / UnitLink.associate)
  if (typeof Unit.associate === 'function') Unit.associate({ UnitLink })
  if (typeof UnitLink.associate === 'function') UnitLink.associate({ Unit })

  return { sequelize, Unit, UnitLink }
}

// --- helpers ---------------------------------------------------------------

function normalizeLinks (raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw

  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw)
      if (Array.isArray(j)) return j
    } catch (_) {}
  }

  return []
}

function normalizePrimaryPerType (links = []) {
  const out = links.map(l => ({
    id: l?.id ?? null,
    type: l?.type ?? '',
    provider: l?.provider ?? null,
    url: l?.url ?? '',
    label: l?.label ?? null,
    is_primary: !!l?.is_primary
  }))

  const seen = new Set()
  for (const l of out) {
    if (!l.is_primary) continue
    if (seen.has(l.type)) l.is_primary = false
    else seen.add(l.type)
  }
  return out
}

function mapUnitOut (row, links = null) {
  const plain = row?.toJSON ? row.toJSON() : row

  return {
    ...plain,

    // front usa is_active boolean (store), mas tabela usa status enum
    is_active: plain.status === 'active',

    // include se vier
    unit_links: Array.isArray(links)
      ? links.map(l => (l?.toJSON ? l.toJSON() : l))
      : (plain.unit_links || [])
  }
}

function statusFromIsActive (payload, fallbackStatus = 'active') {
  // prioridade: status explícito
  if (payload?.status === 'active' || payload?.status === 'inactive') return payload.status

  // store manda is_active (boolean)
  if (typeof payload?.is_active !== 'undefined') {
    return payload.is_active ? 'active' : 'inactive'
  }

  // store pode mandar isActive
  if (typeof payload?.isActive !== 'undefined') {
    return payload.isActive ? 'active' : 'inactive'
  }

  return fallbackStatus
}

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------
module.exports = {
  /**
   * GET /tenant/units
   * Lista unidades com paginação e filtros
   * Query (front):
   *  - page, limit, search, is_active
   *  - group_id (obrigatório), user_id (opcional)
   */
  async list (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Unit, UnitLink } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const page = Number(req.query.page || 1)
      const limit = Number(req.query.limit || 20)
      const offset = (page - 1) * limit

      const search = req.query.search
      const isActive = req.query.is_active

      const where = {}

      // filtro por is_active (boolean / string)
      if (isActive !== '' && typeof isActive !== 'undefined' && isActive !== null) {
        const normalized =
          isActive === true ||
          isActive === 'true' ||
          isActive === 1 ||
          isActive === '1'

        where.status = normalized ? 'active' : 'inactive'
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { locality: { [Op.like]: `%${search}%` } },
          { administrative_area: { [Op.like]: `%${search}%` } }
        ]
      }

      const { count, rows } = await Unit.findAndCountAll({
        where,
        limit,
        offset,
        order: [['name', 'ASC']]
      })

      // carrega links em lote (pra não dar N+1)
      const unitIds = rows.map(u => u.id)
      const links = unitIds.length
        ? await UnitLink.findAll({
          where: {
            unit_id: { [Op.in]: unitIds }
          },
          order: [['type', 'ASC'], ['is_primary', 'DESC'], ['id', 'ASC']]
        })
        : []

      const linksByUnit = new Map()
      for (const l of links) {
        const uid = l.unit_id
        if (!linksByUnit.has(uid)) linksByUnit.set(uid, [])
        linksByUnit.get(uid).push(l)
      }

      const totalPages = Math.ceil(count / limit) || 1

      return res.json({
        data: rows.map(u => mapUnitOut(u, linksByUnit.get(u.id) || [])),
        meta: { total: count, page, limit, totalPages }
      })
    } catch (err) {
      console.error('Erro ao listar unidades:', err)
      return res.status(500).json({
        message: 'Erro ao carregar lista de unidades.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * GET /tenant/units/:id
   * Retorna unidade + unit_links
   */
  async getById (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const { sequelize: tenantSequelize, Unit, UnitLink } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id

      const unit = await Unit.findByPk(id)
      if (!unit) return res.status(404).json({ message: 'Unidade não encontrada.' })

      const links = await UnitLink.findAll({
        where: { unit_id: unit.id },
        order: [['type', 'ASC'], ['is_primary', 'DESC'], ['id', 'ASC']]
      })

      return res.json(mapUnitOut(unit, links))
    } catch (err) {
      console.error('Erro ao buscar unidade por ID:', err)
      return res.status(500).json({
        message: 'Erro ao carregar dados da unidade.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * POST /tenant/units
   * Cria nova unidade + links
   * Body (front):
   *  - name, phone, email, timezone, address..., latitude/longitude/place_id
   *  - unit_links: [{type, provider, url, label, is_primary}]
   * Query/Body:
   *  - group_id (obrigatório), user_id (opcional)
   */
  async create (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null
      const payload = req.body || {}

      const { sequelize: tenantSequelize, Unit, UnitLink } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const t = await sequelize.transaction()
      try {
        const unit = await Unit.create({
          unique_key: randomUUID(),
          name: payload.name,
          status: statusFromIsActive(payload, 'active'),
          phone: payload.phone ?? null,
          email: payload.email ?? null,
          timezone: payload.timezone ?? null,

          address_line1: payload.address_line1 ?? null,
          address_line2: payload.address_line2 ?? null,
          sublocality: payload.sublocality ?? null,
          locality: payload.locality ?? null,
          administrative_area: payload.administrative_area ?? null,
          postal_code: payload.postal_code ?? null,

          latitude: typeof payload.latitude !== 'undefined' ? payload.latitude : null,
          longitude: typeof payload.longitude !== 'undefined' ? payload.longitude : null,
          place_id: payload.place_id ?? null,

          created_by: userId
        }, { transaction: t })

        // links
        const linksIn = normalizePrimaryPerType(normalizeLinks(payload.unit_links || payload.unitLinks))
          .filter(l => l.type && l.url)

        if (linksIn.length) {
          await UnitLink.bulkCreate(
            linksIn.map(l => ({
              unit_id: unit.id,
              type: l.type,
              provider: l.provider,
              url: l.url,
              label: l.label,
              is_primary: !!l.is_primary
            })),
            { transaction: t }
          )
        }

        await t.commit()

        const links = await UnitLink.findAll({
          where: { unit_id: unit.id },
          order: [['type', 'ASC'], ['is_primary', 'DESC'], ['id', 'ASC']]
        })

        return res.status(201).json(mapUnitOut(unit, links))
      } catch (e) {
        await t.rollback().catch(() => {})
        throw e
      }
    } catch (err) {
      console.error('Erro ao criar unidade:', err)
      return res.status(500).json({
        message: 'Erro ao criar unidade.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * PUT /tenant/units/:id
   * Atualiza unidade + links (se vier unit_links no payload, substitui tudo)
   */
  async update (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null
      const payload = req.body || {}

      const { sequelize: tenantSequelize, Unit, UnitLink } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id
      const unit = await Unit.findByPk(id)
      if (!unit) return res.status(404).json({ message: 'Unidade não encontrada.' })

      const t = await sequelize.transaction()
      try {
        unit.name = payload.name ?? unit.name
        unit.status = statusFromIsActive(payload, unit.status)

        if (payload.phone !== undefined) unit.phone = payload.phone
        if (payload.email !== undefined) unit.email = payload.email
        if (payload.timezone !== undefined) unit.timezone = payload.timezone

        if (payload.address_line1 !== undefined) unit.address_line1 = payload.address_line1
        if (payload.address_line2 !== undefined) unit.address_line2 = payload.address_line2
        if (payload.sublocality !== undefined) unit.sublocality = payload.sublocality
        if (payload.locality !== undefined) unit.locality = payload.locality
        if (payload.administrative_area !== undefined) unit.administrative_area = payload.administrative_area
        if (payload.postal_code !== undefined) unit.postal_code = payload.postal_code

        if (payload.latitude !== undefined) unit.latitude = payload.latitude
        if (payload.longitude !== undefined) unit.longitude = payload.longitude
        if (payload.place_id !== undefined) unit.place_id = payload.place_id

        unit.updated_by = userId
        await unit.save({ transaction: t })

        // se vier unit_links: substitui (mais simples e bate com o store)
        const hasLinks =
          Object.prototype.hasOwnProperty.call(payload, 'unit_links') ||
          Object.prototype.hasOwnProperty.call(payload, 'unitLinks')

        if (hasLinks) {
          const linksIn = normalizePrimaryPerType(normalizeLinks(payload.unit_links || payload.unitLinks))
            .filter(l => l.type && l.url)

          // apaga todos (soft delete) e recria
          await UnitLink.destroy({
            where: { unit_id: unit.id },
            transaction: t
          })

          if (linksIn.length) {
            await UnitLink.bulkCreate(
              linksIn.map(l => ({
                unit_id: unit.id,
                type: l.type,
                provider: l.provider,
                url: l.url,
                label: l.label,
                is_primary: !!l.is_primary
              })),
              { transaction: t }
            )
          }
        }

        await t.commit()

        const links = await UnitLink.findAll({
          where: { unit_id: unit.id },
          order: [['type', 'ASC'], ['is_primary', 'DESC'], ['id', 'ASC']]
        })

        return res.json(mapUnitOut(unit, links))
      } catch (e) {
        await t.rollback().catch(() => {})
        throw e
      }
    } catch (err) {
      console.error('Erro ao atualizar unidade:', err)
      return res.status(500).json({
        message: 'Erro ao atualizar unidade.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  },

  /**
   * DELETE /tenant/units/:id
   * Soft delete da unidade + links
   */
  async remove (req, res) {
    let sequelize
    try {
      const groupId = req.query.group_id || req.body.group_id
      const userId = req.query.user_id || req.body.user_id || null

      const { sequelize: tenantSequelize, Unit, UnitLink } = await getTenantModels(groupId)
      sequelize = tenantSequelize

      const id = req.params.id
      const unit = await Unit.findByPk(id)
      if (!unit) return res.status(404).json({ message: 'Unidade não encontrada.' })

      const t = await sequelize.transaction()
      try {
        unit.deleted_by = userId
        await unit.save({ transaction: t })
        await unit.destroy({ transaction: t }) // paranoid soft delete

        // soft delete links também
        await UnitLink.destroy({
          where: { unit_id: unit.id },
          transaction: t
        })

        await t.commit()
        return res.json({ message: 'Unidade removida com sucesso.' })
      } catch (e) {
        await t.rollback().catch(() => {})
        throw e
      }
    } catch (err) {
      console.error('Erro ao excluir unidade:', err)
      return res.status(500).json({
        message: 'Erro ao excluir unidade.',
        error: err.message
      })
    } finally {
      if (sequelize) await sequelize.close().catch(() => {})
    }
  }
}
