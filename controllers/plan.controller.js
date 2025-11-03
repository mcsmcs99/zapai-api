'use strict';
const { Op } = require('sequelize');
const { Plan } = require('../models'); // certifique-se que existe models/plan.js

// GET /plans
// Query params:
//   status=active|inactive|archived (default: active)
//   q=<texto> (busca por nome)
//   page=1&pageSize=20
//   order=name|price|created_at (default: name)
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
    if (status) where.status = status;               // por padrão só ativos
    if (q) where.name = { [Op.like]: `%${q}%` };

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = Math.max((Number(page) || 1) - 1, 0) * limit;

    // sanitize ordem
    const allowedOrder = ['name', 'price', 'created_at', 'updated_at'];
    const safeOrder = allowedOrder.includes(String(order)) ? String(order) : 'name';
    const safeDir = String(dir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const { rows, count } = await Plan.findAndCountAll({
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

// GET /plans/:idOrKey  (aceita id numérico ou unique_key UUID)
exports.getOne = async (req, res, next) => {
  try {
    const { idOrKey } = req.params || {};
    const where = /^\d+$/.test(idOrKey)
      ? { id: Number(idOrKey) }
      : { unique_key: String(idOrKey) };

    const plan = await Plan.findOne({ where });
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });

    return res.json({ data: plan });
  } catch (err) {
    next(err);
  }
};
