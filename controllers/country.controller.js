'use strict'
const { Op } = require('sequelize')
const {
  Country,
  Locale,
  Currency,
  CountryLocale,
  CountryCurrency
} = require('../models')

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

// GET /countries/:countryId/options
exports.getOptionsByCountry = async (req, res, next) => {
  try {
    const { countryId } = req.params || {}

    if (!/^\d+$/.test(String(countryId))) {
      return res.status(400).json({ message: 'countryId inválido.' })
    }

    const country = await Country.findOne({
      where: { id: Number(countryId), status: 'active' },
      attributes: ['id', 'name', 'iso2', 'status']
    })

    if (!country) {
      return res.status(404).json({ message: 'País não encontrado ou inativo.' })
    }

    // Locales habilitados no pivot + locale ativo
    const countryLocales = await CountryLocale.findAll({
      where: { country_id: country.id },
      attributes: ['locale_id', 'is_default'],
      include: [
        {
          model: Locale,
          as: 'locale',
          required: true,
          where: { status: 'active' },
          attributes: ['id', 'code', 'name', 'status']
        }
      ],
      order: [
        ['is_default', 'DESC'],
        ['locale_id', 'ASC']
      ]
    })

    // Currencies habilitadas no pivot + currency ativa
    const countryCurrencies = await CountryCurrency.findAll({
      where: { country_id: country.id },
      attributes: ['currency_id', 'is_default'],
      include: [
        {
          model: Currency,
          as: 'currency',
          required: true,
          where: { status: 'active' },
          attributes: ['id', 'code', 'name', 'symbol', 'status']
        }
      ],
      order: [
        ['is_default', 'DESC'],
        ['currency_id', 'ASC']
      ]
    })

    const locales = countryLocales.map(r => r.locale)
    const currencies = countryCurrencies.map(r => r.currency)

    const defaultLocaleId =
      countryLocales.find(r => r.is_default)?.locale_id || null

    const defaultCurrencyId =
      countryCurrencies.find(r => r.is_default)?.currency_id || null

    return res.json({
      data: {
        country,
        locales,
        currencies,
        defaults: {
          locale_id: defaultLocaleId,
          currency_id: defaultCurrencyId
        }
      }
    })
  } catch (err) {
    next(err)
  }
}