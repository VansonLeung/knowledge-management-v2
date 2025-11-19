const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation
} = require('../controllers/conversation.controller');
const {
  listMessages,
  createMessage
} = require('../controllers/message.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:conversationId', getConversation);
router.put('/:conversationId', updateConversation);
router.delete('/:conversationId', deleteConversation);

router.get('/:conversationId/messages', listMessages);
router.post('/:conversationId/messages', createMessage);

module.exports = router;
