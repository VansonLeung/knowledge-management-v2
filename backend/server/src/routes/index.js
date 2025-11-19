const express = require('express');
const router = express.Router();

// Import route modules
// const authRoutes = require('./auth.routes');
// const conversationRoutes = require('./conversation.routes');
// const fileRoutes = require('./file.routes');

// router.use('/auth', authRoutes);
// router.use('/conversations', conversationRoutes);
// router.use('/files', fileRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

module.exports = router;
