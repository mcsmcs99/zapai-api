'use strict';
const express = require('express');
const router = express.Router();
const PlanCtrl = require('../controllers/plan.controller');

// Lista (com paginação/filtro/busca)
router.get('/', PlanCtrl.list);

// Detalhe por id OU unique_key
router.get('/:idOrKey', PlanCtrl.getOne);

module.exports = router;
