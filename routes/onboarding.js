'use strict';
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth'); // auth(true) → exige JWT
const onboarding = require('../controllers/onboarding.controller');

// POST /onboarding/complete
router.post('/complete', auth(true), onboarding.complete);
router.post('/company', auth(true), onboarding.saveCompany)
router.get('/company', auth(true), onboarding.getCompany)

module.exports = router;
