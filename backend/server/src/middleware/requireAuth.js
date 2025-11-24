const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');

function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }
  if (req.query?.access_token) {
    return String(req.query.access_token).trim();
  }
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing authorization token' });
    }
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
