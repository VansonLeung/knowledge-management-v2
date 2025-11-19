const { User } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');

function sanitizeUser(user) {
  if (!user) return null;
  const { id, email, name, organization, createdAt, updatedAt } = user;
  return { id, email, name, organization, createdAt, updatedAt };
}

async function register(req, res, next) {
  try {
    const { email, password, name, organization } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash, name, organization });

    const token = signToken({ sub: user.id });

    res.status(201).json({ success: true, data: { token, user: sanitizeUser(user) } });
  } catch (error) {
    console.error('[AuthController][register]', error);
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = signToken({ sub: user.id });
    res.json({ success: true, data: { token, user: sanitizeUser(user) } });
  } catch (error) {
    console.error('[AuthController][login]', error);
    next(error);
  }
}

async function profile(req, res) {
  res.json({ success: true, data: sanitizeUser(req.user) });
}

module.exports = {
  register,
  login,
  profile
};
