const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { chatCompletion } = require('../controllers/llm.controller');

const router = express.Router();

router.use(requireAuth);
router.post('/chat', chatCompletion);

module.exports = router;
