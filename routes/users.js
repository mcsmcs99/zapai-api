var express = require('express');
var router = express.Router();
const { User } = require('../models');

// GET /users/admin → retorna o primeiro super_admin
router.get('/admin', async (req, res, next) => {
  try {
    const admin = await User.findOne({ where: { type: 'super_admin', status: 1 } });
    if (!admin) return res.status(404).json({ message: 'Super admin não encontrado' });
    res.json(admin); // defaultScope já exclui password
  } catch (err) {
    next(err);
  }
});

// GET /users/:id → retorna um usuário por id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(user); // defaultScope exclui password
  } catch (err) {
    next(err);
  }
});

module.exports = router;
