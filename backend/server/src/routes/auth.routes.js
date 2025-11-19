const express = require('express');
const { register, login, profile } = require('../controllers/auth.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, profile);

module.exports = router;
