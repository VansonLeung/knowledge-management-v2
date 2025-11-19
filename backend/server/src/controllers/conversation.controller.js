const { Conversation, Message, File } = require('../models');

function sanitizeConversation(conversation) {
  if (!conversation) return null;
  const { id, title, description, createdAt, updatedAt } = conversation;
  return {
    id,
    title,
    description,
    createdAt,
    updatedAt,
    files: conversation.files?.map(file => ({
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      status: file.status
    })) || [],
    lastMessageAt: conversation.lastMessageAt || null
  };
}

async function listConversations(req, res, next) {
  try {
    const conversations = await Conversation.findAll({
      where: { userId: req.user.id },
      order: [['updatedAt', 'DESC']],
      include: [{
        model: File,
        as: 'files',
        through: { attributes: [] },
        attributes: ['id', 'name', 'originalName', 'status']
      }]
    });

    const conversationIds = conversations.map(c => c.id);
    const lastMessageMap = {};

    if (conversationIds.length > 0) {
      const lastMessages = await Message.findAll({
        where: { conversationId: conversationIds },
        attributes: ['conversationId', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      lastMessages.forEach(msg => {
        if (!lastMessageMap[msg.conversationId]) {
          lastMessageMap[msg.conversationId] = msg.createdAt;
        }
      });
    }

    const payload = conversations.map(conv => {
      const plain = conv.get({ plain: true });
      plain.lastMessageAt = lastMessageMap[conv.id] || null;
      return sanitizeConversation(plain);
    });

    res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
}

async function getConversation(req, res, next) {
  try {
    const conversation = await Conversation.findOne({
      where: { id: req.params.conversationId, userId: req.user.id },
      include: [{
        model: File,
        as: 'files',
        through: { attributes: [] },
        attributes: ['id', 'name', 'originalName', 'status']
      }]
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.json({ success: true, data: sanitizeConversation(conversation) });
  } catch (error) {
    next(error);
  }
}

async function createConversation(req, res, next) {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const conversation = await Conversation.create({
      title,
      description,
      userId: req.user.id
    });

    res.status(201).json({ success: true, data: sanitizeConversation(conversation) });
  } catch (error) {
    next(error);
  }
}

async function updateConversation(req, res, next) {
  try {
    const { title, description } = req.body;
    const conversation = await Conversation.findOne({
      where: { id: req.params.conversationId, userId: req.user.id }
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (title !== undefined) conversation.title = title;
    if (description !== undefined) conversation.description = description;
    await conversation.save();

    res.json({ success: true, data: sanitizeConversation(conversation) });
  } catch (error) {
    next(error);
  }
}

async function deleteConversation(req, res, next) {
  try {
    const deleted = await Conversation.destroy({
      where: { id: req.params.conversationId, userId: req.user.id }
    });

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation
};
