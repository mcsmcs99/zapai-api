// src/routes/tenant/staff.js
'use strict';

const express = require('express');
const router = express.Router();
const StaffCtrl = require('../../controllers/tenant/staff.controller');

// Lista colaboradores com paginação/filtro/busca
// GET /tenant/staff
router.get('/', StaffCtrl.list);

// Detalhe de um colaborador por ID
// GET /tenant/staff/:id
router.get('/:id', StaffCtrl.getById);

// Cria um novo colaborador
// POST /tenant/staff
router.post('/', StaffCtrl.create);

// Atualiza um colaborador (full update ou parcial, se quiser reaproveitar)
// PUT /tenant/staff/:id
router.put('/:id', StaffCtrl.update);

// PATCH /tenant/staff/:id
router.patch('/:id', StaffCtrl.update);

// Remove (soft delete) um colaborador
// DELETE /tenant/staff/:id
router.delete('/:id', StaffCtrl.remove);

module.exports = router;
