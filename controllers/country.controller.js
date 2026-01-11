'use strict'
const { Op } = require('sequelize')
const { Country } = require('../models') // certifique-se que existe models/country.js

// GET /countries
// Query params:
//   status=active|inactive (default: active)
//   q=<texto> (busca por name)
//   page=1&pageSize=20
//   order=name|created_at|updated_at (default: name)
//   dir=asc|desc (default: asc)
exports.list = async (req, res, next) => {
  try {
    const {
      status = 'active',
      q = '',
      page = 1,
      pageSize,
      order = 'name',
      dir = 'asc'
    } = req.query || {}

    const where = {}
    if (status) where.status = status
    if (q) where.name = { [Op.like]: `%${q}%` }

    // se não vier pageSize, não limita (Sequelize não envia LIMIT)
    const limit = pageSize ? Number(pageSize) : undefined
    const currentPage = Number(page) || 1
    const offset = limit ? Math.max(currentPage - 1, 0) * limit : undefined

    const allowedOrder = ['name', 'created_at', 'updated_at']
    const safeOrder = allowedOrder.includes(String(order)) ? String(order) : 'name'
    const safeDir = String(dir).toLowerCase() === 'desc' ? 'DESC' : 'ASC'

    const { rows, count } = await Country.findAndCountAll({
      where,
      limit,
      offset,
      order: [[safeOrder, safeDir]],
      // ✅ mantém o que existe e só garante que iso2 venha no retorno
      attributes: ['id', 'name', 'iso2', 'status', 'created_at', 'updated_at']
    })

    return res.json({
      data: rows,
      pagination: {
        total: count,
        page: currentPage,
        pageSize: limit || count,
        pages: limit ? Math.ceil(count / limit) || 1 : 1
      }
    })
  } catch (err) {
    next(err)
  }
}

// GET /countries/:idOrName  (aceita id numérico ou name)
exports.getOne = async (req, res, next) => {
  try {
    const { idOrName } = req.params || {}

    const where = /^\d+$/.test(idOrName)
      ? { id: Number(idOrName) }
      : { name: String(idOrName) } // aqui é match exato do name

    const country = await Country.findOne({
      where,
      // ✅ idem aqui
      attributes: ['id', 'name', 'iso2', 'status', 'created_at', 'updated_at']
    })

    if (!country) {
      return res.status(404).json({ message: 'País não encontrado.' })
    }

    return res.json({ data: country })
  } catch (err) {
    next(err)
  }
}
