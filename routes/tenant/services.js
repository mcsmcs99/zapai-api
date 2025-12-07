// src/routes/tenant/services.js
'use strict';

const express = require('express');
const router = express.Router();
const ServiceCtrl = require('../../controllers/tenant/services.controller');

// Lista serviços com paginação/filtro/busca
// GET /tenant/services
router.get('/', ServiceCtrl.list);

// Detalhe de um serviço por ID
// GET /tenant/services/:id
router.get('/:id', ServiceCtrl.getById);

// Cria um novo serviço
// POST /tenant/services
router.post('/', ServiceCtrl.create);

// Atualiza um serviço (full update ou parcial)
// PUT /tenant/services/:id
router.put('/:id', ServiceCtrl.update);

// PATCH /tenant/services/:id
router.patch('/:id', ServiceCtrl.update);

// Remove (soft delete) um serviço
// DELETE /tenant/services/:id
router.delete('/:id', ServiceCtrl.remove);

module.exports = router;
