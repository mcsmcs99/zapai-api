// utils/auth.js
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const RESET_SECRET = process.env.RESET_JWT_SECRET
const RESET_TTL_MIN = parseInt(process.env.RESET_TOKEN_TTL_MIN || '30', 10)

function shortHash(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex')
}

function signResetToken({ userId, passwordHashFingerprint }) {
  return jwt.sign(
    { sub: String(userId), ph: passwordHashFingerprint, type: 'password_reset' },
    RESET_SECRET,
    { expiresIn: `${RESET_TTL_MIN}m` }
  )
}

function verifyResetToken(token) {
  return jwt.verify(token, RESET_SECRET)
}

async function hashPassword(plain) {
  const SALT_ROUNDS = 10
  return bcrypt.hash(plain, SALT_ROUNDS)
}

module.exports = { shortHash, signResetToken, verifyResetToken, hashPassword }
