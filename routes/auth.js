// routes/auth.js
'use strict'

const express = require('express')
const router = express.Router()

const AuthCtrl = require('../controllers/auth.controller')

// POST /auth/login
router.post('/login', AuthCtrl.login)

// POST /auth/refresh
router.post('/refresh', AuthCtrl.refresh)

// POST /auth/forgot-password
router.post('/forgot-password', AuthCtrl.forgotPassword)

// POST /auth/reset-password
router.post('/reset-password', AuthCtrl.resetPassword)

// POST /auth/register
router.post('/register', AuthCtrl.register)

// POST /auth/validate-account
router.post('/validate-account', AuthCtrl.validateAccount)

// POST /auth/resend-verification
router.post('/resend-verification', AuthCtrl.resendVerification)

module.exports = router
