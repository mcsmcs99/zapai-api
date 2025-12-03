var express = require('express');
var router = express.Router();
const { User } = require('../models');

// GET /users/admin → retorna o primeiro super_admin
router.get('/admin', async (req, res, next) => {
  try {
    const admin = await User.findOne({ where: { type: 'super_admin', status: 'active' } });
    if (!admin) return res.status(404).json({ message: 'Super admin não encontrado' });
    res.json(admin); // defaultScope já exclui password
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id/current-group → atualiza o current_group_id do usuário
router.patch('/:id/current-group', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { current_group_id } = req.body;

    if (typeof current_group_id === 'undefined') {
      return res.status(400).json({
        message: 'Campo current_group_id é obrigatório no corpo da requisição'
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    user.current_group_id = current_group_id;
    await user.save();

    // defaultScope já remove campos sensíveis (ex: password)
    res.json(user);
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
