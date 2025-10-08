var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { signAccess, signRefresh, verifyToken } = require('../services/jwt');

// POST /auth/login  { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios' });

    // precisamos do hash => usar escopo withPassword
    const user = await User.scope('withPassword').findOne({ where: { email, status: 1 } });
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });

    const payload = {
      sub: user.id,
      email: user.email,
      type: user.type,
      tenant_id: user.tenant_id
    };

    const access_token = signAccess(payload);
    const refresh_token = signRefresh(payload);

    // Nunca vazar password
    const safeUser = user.toJSON();
    delete safeUser.password;

    res.json({ user: safeUser, access_token, refresh_token });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh  { refresh_token }
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) return res.status(400).json({ message: 'refresh_token é obrigatório' });

    const decoded = verifyToken(refresh_token);
    if (decoded.typ !== 'refresh') return res.status(400).json({ message: 'Token não é refresh' });

    const payload = { sub: decoded.sub, email: decoded.email, type: decoded.type, tenant_id: decoded.tenant_id };
    const access_token = signAccess(payload);
    const newRefresh = signRefresh(payload);

    res.json({ access_token, refresh_token: newRefresh });
  } catch (err) {
    return res.status(401).json({ message: 'Refresh inválido/expirado' });
  }
});

module.exports = router;
