const { Conversation, Message } = require('../models');

function sanitizeMessage(message) {
  if (!message) return null;
  const { id, role, content, metadata, conversationId, userId, createdAt, updatedAt } = message;
  return { id, role, content, metadata, conversationId, userId, createdAt, updatedAt };
}

async function ensureConversationOwnership(conversationId, userId) {
  const conversation = await Conversation.findOne({ where: { id: conversationId, userId } });
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }
  return conversation;
}

async function listMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    await ensureConversationOwnership(conversationId, req.user.id);

    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = parseInt(req.query.offset || '0', 10);

    const messages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']],
      limit,
      offset
    });

    res.json({ success: true, data: messages.map(msg => sanitizeMessage(msg)) });
  } catch (error) {
    next(error);
  }
}

async function createMessage(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { content, role = 'user', metadata = {} } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    await ensureConversationOwnership(conversationId, req.user.id);

    const validRoles = ['user', 'assistant', 'system'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const message = await Message.create({
      conversationId,
      content,
      role,
      metadata,
      userId: role === 'user' ? req.user.id : null
    });

    res.status(201).json({ success: true, data: sanitizeMessage(message) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listMessages,
  createMessage
};
