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

    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);

    // Nunca vazar password
    const safeUser = user.toJSON();
    delete safeUser.password;

    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh  { refreshToken }
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken é obrigatório' });

    const decoded = verifyToken(refreshToken);
    if (decoded.typ !== 'refresh') return res.status(400).json({ message: 'Token não é refresh' });

    const payload = { sub: decoded.sub, email: decoded.email, type: decoded.type, tenant_id: decoded.tenant_id };
    const accessToken = signAccess(payload);
    const newRefresh = signRefresh(payload);

    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    return res.status(401).json({ message: 'Refresh inválido/expirado' });
  }
});

module.exports = router;
