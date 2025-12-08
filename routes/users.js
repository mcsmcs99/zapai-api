// routes/users.js
'use strict'

const express = require('express')
const router = express.Router()

const UsersCtrl = require('../controllers/users.controller')

// GET /users/admin → retorna o primeiro super_admin
router.get('/admin', UsersCtrl.getAdmin)

// PATCH /users/:id/current-group → atualiza o current_group_id do usuário
router.patch('/:id/current-group', UsersCtrl.updateCurrentGroup)

// PATCH /users/:id → atualiza dados do perfil do usuário
router.patch('/:id', UsersCtrl.updateProfile)

// GET /users/:id → retorna um usuário por id
router.get('/:id', UsersCtrl.getById)

module.exports = router
