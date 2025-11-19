const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key', // Required but can be dummy for local LLM
  baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:18000/v1'
});

module.exports = openai;
