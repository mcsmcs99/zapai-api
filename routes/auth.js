var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const { User } = require('../models');
const { signAccess, signRefresh, verifyToken } = require('../services/jwt');

// Utilitários para reset “sem tabela”
const { shortHash, signResetToken, verifyResetToken, hashPassword } = require('../utils/auth');

/**
 * Helper: transporter de e-mail (ajuste via env)
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT,
  secure: false,
  requireTLS: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  logger: true,  // LOGA no console
  debug: true
});
const FRONT_URL = process.env.FRONT_URL || 'http://localhost:9000';

/**
 * POST /auth/login  { email, password }
 */
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

/**
 * POST /auth/refresh  { refresh_token }
 */
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

/**
 * POST /auth/forgot-password  { email }
 * Sempre responde 200 para não revelar se o email existe.
 * Se existir, envia link temporário:  /reset-password?token=...
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  try {
    if (!email) return res.json({ message: 'O e-mail não foi enviado no payload.' });

    // precisa do hash da senha para fingerprint
    const user = await User.scope('withPassword').findOne({ where: { email, status: 1 } });
    if (!user) return res.json({ message: 'Usuário não encontrado na base de dados.' });

    // fingerprint do hash atual: invalida o token automaticamente após troca de senha
    const fingerprint = shortHash(user.password || '');
    const token = signResetToken({ userId: user.id, passwordHashFingerprint: fingerprint });

    const link = `${FRONT_URL}/reset-password?token=${encodeURIComponent(token)}`;

    // Enviar e-mail (ajuste o remetente e o template)
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Redefinição de senha',
      html: `
        <p>Você solicitou redefinir sua senha.</p>
        <p>Use o link abaixo (expira em ${process.env.RESET_TOKEN_TTL_MIN || 30} minutos):</p>
        <p><a href="${link}">${link}</a></p>
        <p>Se não foi você, ignore este e-mail.</p>
      `
    });
    const okMsg = { message: 'Se o e-mail existir, enviaremos um link de recuperação.', info: info };

    return res.json(okMsg);
  } catch (err) {
    return res.json(err);
  }
});

/**
 * POST /auth/reset-password  { token, password }
 * Verifica token + fingerprint do hash atual; troca a senha e pronto.
 */
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
  }

  try {
    const payload = verifyResetToken(token); // { sub, ph, type, iat, exp }
    if (payload.type !== 'password_reset') {
      return res.status(400).json({ message: 'Token inválido.' });
    }

    // buscar usuário com hash atual
    const user = await User.scope('withPassword').findOne({ where: { id: payload.sub, status: 1 } });
    if (!user) return res.status(400).json({ message: 'Token inválido.' });

    // confere fingerprint do hash atual com o do token
    const currentFingerprint = shortHash(user.password || '');
    if (currentFingerprint !== payload.ph) {
      return res.status(400).json({ message: 'Token inválido ou já utilizado.' });
    }

    // troca a senha
    const newHash = await hashPassword(password);
    user.password = newHash;
    await user.save();

    // como o hash mudou, o token antigo se invalida sozinho
    return res.json({ message: 'Senha redefinida com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: 'Token inválido ou expirado.' });
  }
});

module.exports = router;
