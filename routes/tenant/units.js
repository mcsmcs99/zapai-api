// routes/tenant/units.js
'use strict'

const express = require('express')
const router = express.Router()

const UnitsController = require('../../controllers/tenant/units.controller')

router.get('/', UnitsController.list)
router.get('/:id', UnitsController.getById)
router.post('/', UnitsController.create)
router.put('/:id', UnitsController.update)
router.delete('/:id', UnitsController.remove)

module.exports = router
