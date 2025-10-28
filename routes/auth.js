'use strict';
var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const { User } = require('../models');
const { signAccess, signRefresh, verifyToken, signEmailVerificationToken, verifyEmailVerificationToken } = require('../services/jwt');

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

    const normEmail = String(email).trim();

    const user = await User
      .scope('withPassword')
      .findOne({ where: { email: normEmail } });

    // usuário não encontrado
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });

    // senha incorreta
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });

    // 🚧 conta pendente de verificação
    if (user.status === 'pending_verification') {
      // resposta padrão
      return res.status(403).json({
        message: 'Validação de e-mail pendente. Deseja reenviar o código?',
        error_code: 'EMAIL_VERIFICATION_REQUIRED'
      });
    }

    // ✅ conta ativa → gera tokens normais
    const payload = { sub: user.id, email: user.email, type: user.type };
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
      .findOne({ where: { id: payload.sub } });

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

    // Verifica duplicidade
    const exists = await User.findOne({ where: { email: normEmail } });
    if (exists) {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }

    // Hash da senha
    const hash = await bcrypt.hash(password, 10);

    // 🔐 Código de verificação (6 dígitos)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔑 Token de verificação (curto, ex.: 15 min) contendo { email, code, purpose }
    const verificationToken = signEmailVerificationToken({ email: normEmail, code: verificationCode });

    // Expiração (mesma janela do token)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Cria usuário pendente
    const user = await User.create({
      unique_key: await uuidv4(),
      name: name.trim(),
      email: normEmail,
      password: hash,
      type: 'owner',
      status: 'pending_verification',
      token_verification: verificationCode,
      token_expired: expiresAt
    });

    // Link de verificação para o front
    const link = `${FRONT_URL}/validate-account?token=${encodeURIComponent(verificationToken)}&email=${normEmail}`;

    // ✉️ E-mail com código + link
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: normEmail,
      subject: 'Verificação de conta',
      html: `
        <h2>Olá, ${name}!</h2>
        <p>Seu código de verificação é:</p>
        <h3 style="font-size:22px;letter-spacing:2px">${verificationCode}</h3>
        <p>Ou clique no link abaixo para validar sua conta (expira em 15 minutos):</p>
        <a href="${link}" target="_blank" style="display:inline-block;margin-top:8px;background:#1976d2;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;">
          Verificar conta
        </a>
      `
    });

    // (Opcional) emitir tokens de sessão mesmo pendente — mantenho seu comportamento
    const payload = { sub: user.id, email: user.email, type: user.type };
    const access_token = signAccess(payload);
    const refresh_token = signRefresh(payload);

    const safeUser = user.toJSON();
    delete safeUser.password;
    delete safeUser.token_verification;

    return res.status(201).json({
      message: 'Usuário criado. Enviamos um código e link de verificação para o seu e-mail.',
      user: safeUser,
      access_token,
      refresh_token
    });

  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }
    if (err?.name === 'SequelizeValidationError') {
      const msg = err.errors?.[0]?.message || 'Dados inválidos.';
      return res.status(400).json({ message: msg });
    }
    console.error(err);
    return next(err);
  }
});

router.post('/validate-account', async (req, res) => {
  const { token, code } = req.body || {};
  if (!token) return res.status(400).json({ message: 'Token é obrigatório.' });

  try {
    // valida SOMENTE o token recebido no corpo
    const payload = verifyEmailVerificationToken(token); // { email, purpose, iat, exp, ... }
    const email = String(payload?.email || '').trim().toLowerCase();

    if (!email || payload?.purpose !== 'email_verification') {
      return res.status(400).json({ message: 'Token inválido.' });
    }

    // exige code do corpo (ignora qualquer code no token/link)
    const bodyCode = String(code || '').replace(/\D+/g, '');
    if (!/^\d{6}$/.test(bodyCode)) {
      return res.status(400).json({ message: 'Código inválido. Informe 6 dígitos.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Token inválido.' });

    if (user.status === 'active' || user.status === 'pending_group') {
      return res.status(200).json({ message: 'Conta já validada.' });
    }

    if (!user.token_expired || new Date(user.token_expired).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Token expirado.' });
    }

    if (String(user.token_verification || '') !== bodyCode) {
      return res.status(400).json({ message: 'Código de verificação inválido.' });
    }

    user.status = 'pending_group';
    user.token_verification = null;
    user.token_expired = null;
    await user.save();

    return res.json({ message: 'Conta validada com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: 'Token inválido ou expirado.' });
  }
});


router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: 'e-mail ausente.' });
    }
    
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      return res.status(400).json({ message: 'Usuário não encontrado.' });
    }

    // Se não estiver mais pendente, não precisa reenviar
    if (user.status !== 'pending_verification') {
      return res.status(200).json({ message: 'Conta já está verificada.' });
    }

    // 🔐 Código de verificação (6 dígitos)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔑 Token de verificação (curto, ex.: 15 min) contendo { email, code, purpose }
    const verificationToken = signEmailVerificationToken({ email: email, code: verificationCode });

    // Expiração (mesma janela do token)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.token_verification = verificationCode;
    user.token_expired = expiresAt;

    await user.save();

    // Link de verificação para o front
    const link = `${FRONT_URL}/validate-account?token=${encodeURIComponent(verificationToken)}&email=${email}`;
    const token = `${encodeURIComponent(verificationToken)}`;

    // ✉️ E-mail com código + link
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verificação de conta',
      html: `
        <h2>Olá, ${user.name}!</h2>
        <p>Seu código de verificação é:</p>
        <h3 style="font-size:22px;letter-spacing:2px">${verificationCode}</h3>
        <p>Ou clique no link abaixo para validar sua conta (expira em 15 minutos):</p>
        <a href="${link}" target="_blank" style="display:inline-block;margin-top:8px;background:#1976d2;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;">
          Verificar conta
        </a>
      `
    });

    // 🔙 Resposta mínima (sem redirecionar). Se quiser, pode retornar token/link também.
    return res.json({
      message: 'Código reenviado para o seu e-mail.',
      token: token
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: 'Não foi possível reenviar o código.', err });
  }
});
module.exports = router;
