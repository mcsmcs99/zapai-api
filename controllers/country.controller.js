'use strict';
const { Op } = require('sequelize');
const { Country } = require('../models'); // certifique-se que existe models/country.js

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
      pageSize = 20,
      order = 'name',
      dir = 'asc'
    } = req.query || {};

    const where = {};
    if (status) where.status = status; // por padrão só ativos
    if (q) where.name = { [Op.like]: `%${q}%` };

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = Math.max((Number(page) || 1) - 1, 0) * limit;

    // sanitize ordem
    const allowedOrder = ['name', 'created_at', 'updated_at'];
    const safeOrder = allowedOrder.includes(String(order)) ? String(order) : 'name';
    const safeDir = String(dir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const { rows, count } = await Country.findAndCountAll({
      where,
      limit,
      offset,
      order: [[safeOrder, safeDir]]
    });

    return res.json({
      data: rows,
      pagination: {
        total: count,
        page: Number(page) || 1,
        pageSize: limit,
        pages: Math.ceil(count / limit) || 1
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /countries/:idOrName  (aceita id numérico ou name)
exports.getOne = async (req, res, next) => {
  try {
    const { idOrName } = req.params || {};

    const where = /^\d+$/.test(idOrName)
      ? { id: Number(idOrName) }
      : { name: String(idOrName) }; // aqui é match exato do name

    const country = await Country.findOne({ where });
    if (!country) {
      return res.status(404).json({ message: 'País não encontrado.' });
    }

    return res.json({ data: country });
  } catch (err) {
    next(err);
  }
};
