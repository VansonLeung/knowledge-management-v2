const { Conversation, Message } = require('../models');
const openai = require('../config/openai');
const ragService = require('../services/rag');
const embeddings = require('../services/embeddings');

const DEFAULT_INDEX = process.env.RAG_COLLECTION || 'knowledge_documents';
const DEFAULT_MODEL = process.env.DEFAULT_LLM_MODEL || 'gpt-4o-mini';

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

function clampNumber(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

function buildWorkflowPrompt(query, documents) {
  if (!documents.length) {
    return `Question: ${query}`;
  }

  const context = documents
    .map((doc, idx) => {
      const title = doc.title || doc.metadata?.title || `Document ${idx + 1}`;
      const snippet = (doc.content || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1000);
      return `Document ${idx + 1}: ${title}\nSource: ${doc.metadata?.source || doc.metadata?.path || doc.id}\nExcerpt: ${snippet}`;
    })
    .join('\n\n');

  return `You are answering the user question using the knowledge base excerpts below. Cite the document numbers when referencing evidence.\n\nContext:\n${context}\n\nQuestion:\n${query}`;
}

function initEventStream(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  if (res.flushHeaders) {
    res.flushHeaders();
  }
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
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

async function streamMessage(req, res, next) {
  const { conversationId } = req.params;
  const { content } = req.body;

  try {
    if (!content) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    await ensureConversationOwnership(conversationId, req.user.id);
  } catch (error) {
    return next(error);
  }

  initEventStream(res);
  let clientClosed = false;
  req.on('close', () => {
    clientClosed = true;
  });

  const safeSend = (event, data) => {
    if (clientClosed || res.writableEnded) return;
    sendEvent(res, event, data);
  };

  const fileIds = Array.isArray(req.body.fileIds) ? req.body.fileIds : [];
  const metadataScope = fileIds.length ? 'files' : 'knowledge-base';

  try {
    const userMessage = await Message.create({
      conversationId,
      content,
      role: 'user',
      metadata: { fileIds, scope: metadataScope },
      userId: req.user.id
    });
    safeSend('user_message', sanitizeMessage(userMessage));

    const collection = req.body.index || DEFAULT_INDEX;
    const contextLimit = clampNumber(req.body.maxContextItems || 6, 1, 15);
    const searchMode = (req.body.searchMode || 'hybrid').toLowerCase();
    const filters = req.body.metadata && typeof req.body.metadata === 'object' ? { ...req.body.metadata } : {};
    if (fileIds.length) {
      filters['metadata.fileId'] = fileIds.length === 1 ? fileIds[0] : fileIds;
    }

    let vectorOptions = null;
    if (searchMode === 'vector' || searchMode === 'hybrid') {
      try {
        const queryEmbedding = await embeddings.embedText(content);
        const vectorWeightInput = Number(req.body.vectorWeight);
        const textWeightInput = Number(req.body.textWeight);
        const candidateInput = Number(req.body.candidateCount);

        vectorOptions = {
          embedding: queryEmbedding,
          mode: searchMode,
          vectorWeight: Number.isFinite(vectorWeightInput) ? clampNumber(vectorWeightInput, 0, 1) : undefined,
          textWeight: Number.isFinite(textWeightInput) ? clampNumber(textWeightInput, 0, 1) : undefined,
          candidateCount: Number.isFinite(candidateInput) ? clampNumber(candidateInput, contextLimit, 500) : undefined
        };
      } catch (error) {
        throw new Error('Failed to generate query embedding');
      }
    }

    const provider = ragService.getProvider();
    const documents = await provider.search(collection, content, {
      limit: contextLimit,
      filters,
      vector: vectorOptions
    });

    safeSend('context', { documents, searchMode });

    const systemPrompt = req.body.systemPrompt || 'You are a helpful assistant that cites document numbers when answering.';
    const model = req.body.llmModel || DEFAULT_MODEL;
    const temperature = req.body.temperature !== undefined ? clampNumber(req.body.temperature, 0, 2) : 0.2;
    const prompt = buildWorkflowPrompt(content, documents);

    const completion = await openai.chat.completions.create({
      model,
      temperature,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });

    let assistantContent = '';
    let finishReason = null;
    let usage = null;

    for await (const part of completion) {
      if (clientClosed) break;
      finishReason = part.choices?.[0]?.finish_reason || finishReason;
      usage = part.usage || usage;
      const token = part.choices?.[0]?.delta?.content;
      if (token) {
        assistantContent += token;
        safeSend('token', { token });
      }
    }

    if (!assistantContent && !clientClosed) {
      safeSend('error', { message: 'Assistant did not return any content' });
      return res.end();
    }

    const assistantMessage = await Message.create({
      conversationId,
      content: assistantContent,
      role: 'assistant',
      metadata: {
        response: {
          index: collection,
          searchMode,
          contextCount: documents.length,
          fileFilter: fileIds
        },
        context: documents,
        llm: {
          model,
          usage: usage || null,
          finishReason
        }
      }
    });

    safeSend('assistant_message', sanitizeMessage(assistantMessage));
    safeSend('done', { ok: true });
    res.end();
  } catch (error) {
    console.error('[MessageController] Streaming failed', error);
    if (!clientClosed) {
      safeSend('error', { message: error.message || 'Streaming failed' });
      res.end();
    }
  }
}

module.exports = {
  listMessages,
  createMessage,
  streamMessage
};
