const openai = require('../config/openai');

const DEFAULT_MODEL = process.env.DEFAULT_LLM_MODEL || 'gpt-4o-mini';

function clampNumber(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

function normalizeMessages(body = {}) {
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    return body.messages;
  }

  const prompt = body.prompt || body.userPrompt;
  if (!prompt) return null;

  const messages = [];
  if (body.systemPrompt) {
    messages.push({ role: 'system', content: body.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

async function chatCompletion(req, res, next) {
  try {
    const messages = normalizeMessages(req.body);
    if (!messages) {
      return res.status(400).json({ success: false, error: 'Provide either messages[] or prompt.' });
    }

    const model = req.body.model || DEFAULT_MODEL;
    const temperature = req.body.temperature !== undefined ? clampNumber(req.body.temperature, 0, 2) : 0.2;
    const stream = Boolean(req.body.stream);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      if (res.flushHeaders) {
        res.flushHeaders();
      }

      try {
        const completionStream = await openai.chat.completions.create({
          model,
          temperature,
          messages,
          stream: true
        });

        res.write(`data: ${JSON.stringify({ event: 'start', model })}\n\n`);

        let usage = null;
        for await (const chunk of completionStream) {
          const choice = chunk.choices?.[0];
          if (chunk.usage) {
            usage = chunk.usage;
          }
          if (choice?.delta?.content) {
            const delta = Array.isArray(choice.delta.content)
              ? choice.delta.content.join('')
              : choice.delta.content;
            if (delta) {
              res.write(`data: ${JSON.stringify({ event: 'delta', delta })}\n\n`);
            }
          }
          if (choice?.finish_reason) {
            res.write(`data: ${JSON.stringify({ event: 'finish', reason: choice.finish_reason })}\n\n`);
          }
        }

        res.write(`data: ${JSON.stringify({ event: 'end', usage })}\n\n`);
        res.end();
      } catch (streamError) {
        res.write(`data: ${JSON.stringify({ event: 'error', message: streamError.message })}\n\n`);
        res.end();
      }
      return;
    }

    const completion = await openai.chat.completions.create({
      model,
      temperature,
      messages
    });

    const firstChoice = completion.choices?.[0]?.message || null;

    res.json({
      success: true,
      data: {
        model,
        message: firstChoice,
        usage: completion.usage || null,
        finishReason: completion.choices?.[0]?.finish_reason || null
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  chatCompletion
};
