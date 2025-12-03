// src/routes/group.js
'use strict';

const express = require('express');
const router = express.Router();
const GroupCtrl = require('../controllers/group.controller');

// Lista grupos (empresas) com paginação/filtro/busca
// GET /groups
router.get('/', GroupCtrl.index);

// Detalhe de um grupo por ID
// GET /groups/:id
router.get('/:id', GroupCtrl.show);

// Atualiza um grupo (empresa)
// PUT /groups/:id
router.put('/:id', GroupCtrl.update);

// PATCH /groups/:id
router.patch('/:id', GroupCtrl.update);

module.exports = router;
