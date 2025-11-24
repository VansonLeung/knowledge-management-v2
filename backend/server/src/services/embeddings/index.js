const openai = require('../../config/openai');

const DEFAULT_EMBEDDING_MODEL = process.env.DEFAULT_EMBEDDING_MODEL || 'text-embedding-3-small';
const MAX_BATCH_SIZE = Math.max(1, Number(process.env.EMBEDDING_BATCH_SIZE || 16));

function isEmbeddingEnabled() {
  return Boolean(DEFAULT_EMBEDDING_MODEL);
}

function sanitizeEmbedding(vector) {
  if (!Array.isArray(vector)) return null;
  return vector.map(value => Number(value) || 0);
}

async function embedTexts(inputs, { model = DEFAULT_EMBEDDING_MODEL } = {}) {
  if (!model || !Array.isArray(inputs) || inputs.length === 0) {
    return [];
  }

  const sanitizedInputs = inputs.map(text => (typeof text === 'string' ? text : String(text ?? '')));
  const chunks = [];

  for (let start = 0; start < sanitizedInputs.length; start += MAX_BATCH_SIZE) {
    const batch = sanitizedInputs.slice(start, start + MAX_BATCH_SIZE);
    try {
      const response = await openai.embeddings.create({ model, input: batch });
      response.data.forEach(item => {
        chunks.push(sanitizeEmbedding(item.embedding));
      });
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embeddings', error.message);
      throw error;
    }
  }

  return chunks;
}

async function embedText(input, options = {}) {
  const [vector] = await embedTexts([input], options);
  return vector;
}

function averageEmbedding(vectors = []) {
  const usable = vectors.filter(vec => Array.isArray(vec));
  if (!usable.length) return null;

  const dimension = usable[0].length;
  if (!dimension) return null;

  const sum = new Array(dimension).fill(0);
  usable.forEach(vec => {
    vec.forEach((value, idx) => {
      if (idx < dimension) {
        sum[idx] += value;
      }
    });
  });

  return sum.map(value => value / usable.length);
}

module.exports = {
  embedText,
  embedTexts,
  averageEmbedding,
  isEmbeddingEnabled
};
