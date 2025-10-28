// services/jwt.js
const jwt = require('jsonwebtoken');

const SECRET           = process.env.JWT_SECRET || 'devsecret';
const ACCESS_EXPIRES   = process.env.JWT_EXPIRES || '15m';
const REFRESH_EXPIRES  = process.env.JWT_REFRESH_EXPIRES || '30d';

// (opcional) segredos/expirações específicos p/ verificação de e-mail
const VERIFY_SECRET    = process.env.JWT_VERIFY_SECRET || SECRET;
const VERIFY_EXPIRES   = process.env.JWT_VERIFY_EXPIRES || '15m';

// === Tokens já existentes ===
function signAccess(payload, opts = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES, ...opts });
}
function signRefresh(payload, opts = {}) {
  return jwt.sign({ ...payload, typ: 'refresh' }, SECRET, { expiresIn: REFRESH_EXPIRES, ...opts });
}
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// === NOVOS: verificação de e-mail (payload inclui { email, code, purpose }) ===
function signEmailVerificationToken({ email, code }, opts = {}) {
  if (!email || !code) throw new Error('email e code são obrigatórios para o token de verificação');
  const payload = { email: String(email).toLowerCase(), code: String(code), purpose: 'email_verification' };
  return jwt.sign(payload, VERIFY_SECRET, { expiresIn: VERIFY_EXPIRES, ...opts });
}
function verifyEmailVerificationToken(token) {
  return jwt.verify(token, VERIFY_SECRET);
}

module.exports = {
  signAccess,
  signRefresh,
  verifyToken,
  signEmailVerificationToken,
  verifyEmailVerificationToken
};
