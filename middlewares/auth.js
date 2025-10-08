const { verifyToken } = require('../services/jwt');

/**
 * Lê o bearer token e injeta req.user
 */
module.exports = function auth(required = true) {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;

    if (!token) {
      return required
        ? res.status(401).json({ message: 'Token ausente' })
        : next();
    }

    try {
      const payload = verifyToken(token);
      req.user = payload; // ex.: { sub, email, type, tenant_id, ... }
      next();
    } catch (e) {
      return res.status(401).json({ message: 'Token inválido/expirado' });
    }
  };
};
