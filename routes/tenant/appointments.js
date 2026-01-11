// src/routes/tenant/appointments.js
'use strict'

const express = require('express')
const router = express.Router()
const AppointmentCtrl = require('../../controllers/tenant/appointments.controller')

// ✅ Conflitos de agenda (rota dedicada pro editor)
// GET /tenant/appointments/conflicts
// suporta query: group_id, collaborator_id (ou collab), date (YYYY-MM-DD ou DD/MM/YYYY)
// opcional: exclude_id, include_cancelled, start, end
// ⚠️ precisa vir ANTES de "/:id" pra não bater como parâmetro
router.get('/conflicts', AppointmentCtrl.conflicts)

// Lista agendamentos com paginação/filtro/busca
// GET /tenant/appointments
// suporta query: page, limit, status, search, from, to, user_id, group_id
router.get('/', AppointmentCtrl.list)

// Detalhe de um agendamento por ID
// GET /tenant/appointments/:id
// suporta query: user_id, group_id
router.get('/:id', AppointmentCtrl.getById)

// Cria um novo agendamento
// POST /tenant/appointments
// body: { service_id, collaborator_id, customer_id, date, start, end, price?, status?, notes? }
// suporta query/body: user_id, group_id
router.post('/', AppointmentCtrl.create)

// Atualiza um agendamento (full update ou parcial)
// PUT /tenant/appointments/:id
router.put('/:id', AppointmentCtrl.update)

// PATCH /tenant/appointments/:id
router.patch('/:id', AppointmentCtrl.update)

// Remove (soft delete) um agendamento
// DELETE /tenant/appointments/:id
// suporta query/body: user_id, group_id
router.delete('/:id', AppointmentCtrl.remove)

module.exports = router
