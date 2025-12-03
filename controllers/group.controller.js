// src/controllers/group.controller.js
'use strict';

const { Op } = require('sequelize')
const { Group, Tenant, Country, UsersGroup, User } = require('../models')

/**
 * Lista grupos (empresas) com paginação e filtros básicos
 * GET /groups
 */
exports.index = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      tenant_id,
      search
    } = req.query

    const where = {}

    if (status) {
      where.status = status
    }

    if (tenant_id) {
      where.tenant_id = tenant_id
    }

    if (search) {
      where[Op.or] = [
        { company_name: { [Op.like]: `%${search}%` } },
        { company_fantasy_name: { [Op.like]: `%${search}%` } }
      ]
    }

    const offset = (Number(page) - 1) * Number(limit)

    const { rows, count } = await Group.findAndCountAll({
      where,
      offset,
      limit: Number(limit),
      order: [['created_at', 'DESC']],
      include: [
        { model: Tenant, as: 'tenant' },
        { model: Country, as: 'country' }
      ]
    })

    return res.status(200).json({
      data: rows,
      meta: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)) || 1
      }
    })
  } catch (error) {
    console.error('Error listing groups:', error)
    return res.status(500).json({
      message: 'Error listing groups',
      error: error.message
    })
  }
}

/**
 * Detalhe de um grupo (empresa) por ID
 * GET /groups/:id
 */
exports.show = async (req, res) => {
  try {
    const { id } = req.params

    const group = await Group.findByPk(id, {
      include: [
        { model: Tenant, as: 'tenant' },
        { model: Country, as: 'country' },
        {
          model: UsersGroup,
          as: 'memberships',
          include: [{ model: User, as: 'user' }]
        }
      ]
    })

    if (!group) {
      return res.status(404).json({ message: 'Group not found' })
    }

    return res.status(200).json(group)
  } catch (error) {
    console.error('Error fetching group:', error)
    return res.status(500).json({
      message: 'Error fetching group',
      error: error.message
    })
  }
}

/**
 * Atualiza um grupo (empresa)
 * PUT/PATCH /groups/:id
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params

    const group = await Group.findByPk(id)
    if (!group) {
      return res.status(404).json({ message: 'Group not found' })
    }

    const {
      document_type,
      document_number,
      company_name,
      company_fantasy_name,
      phone_fix,
      phone_cellular,
      link_instagram,
      link_facebook,
      link_whatsapp,
      tenant_id,
      country_id,
      status
    } = req.body

    const userId = req.user?.id || null

    await group.update({
      document_type: document_type ?? group.document_type,
      document_number: document_number ?? group.document_number,
      company_name: company_name ?? group.company_name,
      company_fantasy_name: company_fantasy_name ?? group.company_fantasy_name,
      phone_fix: phone_fix ?? group.phone_fix,
      phone_cellular: phone_cellular ?? group.phone_cellular,
      link_instagram: link_instagram ?? group.link_instagram,
      link_facebook: link_facebook ?? group.link_facebook,
      link_whatsapp: link_whatsapp ?? group.link_whatsapp,
      tenant_id: tenant_id ?? group.tenant_id,
      country_id: country_id ?? group.country_id,
      status: status ?? group.status,
      updated_by: userId
    })

    return res.status(200).json(group)
  } catch (error) {
    console.error('Error updating group:', error)
    return res.status(500).json({
      message: 'Error updating group',
      error: error.message
    })
  }
}
