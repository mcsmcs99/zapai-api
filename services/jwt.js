const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'devsecret';
const ACCESS_EXPIRES = process.env.JWT_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

function signAccess(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES });
}
function signRefresh(payload) {
  return jwt.sign({ ...payload, typ: 'refresh' }, SECRET, { expiresIn: REFRESH_EXPIRES });
}
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signAccess, signRefresh, verifyToken };
