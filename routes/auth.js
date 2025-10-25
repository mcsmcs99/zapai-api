'use strict';
var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const { User } = require('../models');
const { signAccess, signRefresh, verifyToken } = require('../services/jwt');

// Utils de reset “sem tabela”
const { shortHash, signResetToken, verifyResetToken, hashPassword } = require('../utils/auth');

// gerar unique_key (uuid esm -> import dinâmico)
async function uuidv4() {
  const { v4 } = await import('uuid');
  return v4();
}

/**
 * Transporter de e-mail
 */
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // TLS implícito apenas na 465
  requireTLS: SMTP_PORT !== 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  logger: true,
  debug: true
});
const FRONT_URL = process.env.FRONT_URL || 'http://localhost:9000';

/**
 * POST /auth/login  { email, password }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const user = await User
      .scope('withPassword')
      .findOne({ where: { email: String(email).trim().toLowerCase() } });

    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });

    // payload sem tenant_id (não existe mais em users)
    const payload = {
      sub: user.id,
      email: user.email,
      type: user.type
    };

    const access_token = signAccess(payload);
    const refresh_token = signRefresh(payload);

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
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) {
      return res.status(400).json({ message: 'refresh_token é obrigatório' });
    }

    const decoded = verifyToken(refresh_token);
    if (decoded.typ !== 'refresh') {
      return res.status(400).json({ message: 'Token não é refresh' });
    }

    const payload = { sub: decoded.sub, email: decoded.email, type: decoded.type };
    const access_token = signAccess(payload);
    const newRefresh = signRefresh(payload);

    return res.json({ access_token, refresh_token: newRefresh });
  } catch (err) {
    return res.status(401).json({ message: 'Refresh inválido/expirado' });
  }
});

/**
 * POST /auth/forgot-password  { email }
 * Sempre responde 200 para não revelar se o email existe.
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  try {
    if (!email) return res.json({ message: 'O e-mail não foi enviado no payload.' });

    const user = await User
      .scope('withPassword')
      .findOne({
        where: {
          email: String(email).trim().toLowerCase(),
          status: 'active' // novo ENUM
        }
      });

    if (!user) return res.json({ message: 'Usuário não encontrado na base de dados.' });

    const fingerprint = shortHash(user.password || '');
    const token = signResetToken({ userId: user.id, passwordHashFingerprint: fingerprint });
    const link = `${FRONT_URL}/reset-password?token=${encodeURIComponent(token)}`;

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

    return res.json({ message: 'Se o e-mail existir, enviaremos um link de recuperação.', info });
  } catch (err) {
    return res.json(err);
  }
});

/**
 * POST /auth/reset-password  { token, password }
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

    const user = await User
      .scope('withPassword')
      .findOne({ where: { id: payload.sub, status: 'active' } });

    if (!user) return res.status(400).json({ message: 'Token inválido.' });

    const currentFingerprint = shortHash(user.password || '');
    if (currentFingerprint !== payload.ph) {
      return res.status(400).json({ message: 'Token inválido ou já utilizado.' });
    }

    const newHash = await hashPassword(password);
    user.password = newHash;
    await user.save();

    return res.json({ message: 'Senha redefinida com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: 'Token inválido ou expirado.' });
  }
});

/**
 * POST /auth/register  { name, email, password }
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const normEmail = String(email).trim().toLowerCase();

    const exists = await User.findOne({ where: { email: normEmail } });
    if (exists) {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      unique_key: await uuidv4(),    // campo obrigatório na nova tabela
      name: name.trim(),
      email: normEmail,
      password: hash,
      type: 'owner',                 // padrão do seu fluxo
      status: 'active'               // ou 'pending_group' se quiser onboarding por empresa
    });

    const payload = { sub: user.id, email: user.email, type: user.type };
    const access_token = signAccess(payload);
    const refresh_token = signRefresh(payload);

    const safeUser = user.toJSON();
    delete safeUser.password;

    return res.status(201).json({ user: safeUser, access_token, refresh_token });
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }
    if (err?.name === 'SequelizeValidationError') {
      const msg = err.errors?.[0]?.message || 'Dados inválidos.';
      return res.status(400).json({ message: msg });
    }
    return next(err);
  }
});

module.exports = router;
