'use strict';
const express = require('express');
const router = express.Router();
const CountryCtrl = require('../controllers/country.controller');

// Lista (com paginação/filtro/busca)
router.get('/', CountryCtrl.list);

// Detalhe por id OU name
router.get('/:idOrName', CountryCtrl.getOne);

// Opções por país (locales + currencies)
router.get('/:countryId/options', CountryCtrl.getOptionsByCountry)

module.exports = router;
