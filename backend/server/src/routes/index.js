const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const conversationRoutes = require('./conversation.routes');
const fileRoutes = require('./file.routes');
const folderRoutes = require('./folder.routes');
const ragRoutes = require('./rag.routes');
const llmRoutes = require('./llm.routes');

router.use('/auth', authRoutes);
router.use('/conversations', conversationRoutes);
router.use('/files', fileRoutes);
router.use('/folders', folderRoutes);
router.use('/rag', ragRoutes);
router.use('/llm', llmRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

module.exports = router;
