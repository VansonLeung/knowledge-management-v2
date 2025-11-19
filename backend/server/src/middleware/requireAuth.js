const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const decoded = verifyToken(token);

    const user = await User.findByPk(decoded.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

module.exports = requireAuth;
