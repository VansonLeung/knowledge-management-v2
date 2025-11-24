const { Client } = require('@elastic/elasticsearch');
const RagProvider = require('../../interfaces/RagProvider');
const { embedTexts, averageEmbedding } = require('../embeddings');

const DEFAULT_SEARCH_FIELDS = ['content', 'title', 'metadata.*', 'entities.name'];

function resolveKeywordField(key, value) {
  if (key.endsWith('.keyword')) return key;
  const sample = Array.isArray(value) ? value.find(item => typeof item === 'string') : value;
  if (typeof sample === 'string') {
    return `${key}.keyword`;
  }
  return key;
}

function normalizeChunk(chunk, idx, docId = 'doc') {
  if (!chunk) return null;

  const chunkId = chunk.id || `${docId}::chunk-${idx}`;

  if (typeof chunk === 'string') {
    return { id: chunkId, content: chunk, embedding: null };
  }

  const content = typeof chunk.content === 'string'
    ? chunk.content
    : typeof chunk.text === 'string'
      ? chunk.text
      : chunk.value !== undefined
        ? String(chunk.value)
        : '';

  if (!content) {
    return null;
  }

  const normalized = {
    id: chunkId,
    content,
    embedding: Array.isArray(chunk.embedding)
      ? chunk.embedding.map(value => Number(value) || 0)
      : null
  };

  if (chunk.metadata && typeof chunk.metadata === 'object') {
    normalized.metadata = chunk.metadata;
  }

  return normalized;
}

function normalizeChunks(chunks = [], docId) {
  if (!Array.isArray(chunks)) return [];
  return chunks
    .map((chunk, idx) => normalizeChunk(chunk, idx, docId))
    .filter(Boolean);
}

function sanitizeChunksForOutput(chunks = []) {
  if (!Array.isArray(chunks)) return [];
  return chunks.map(chunk => ({
    id: chunk.id,
    content: chunk.content,
    metadata: chunk.metadata
  }));
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return null;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const valueA = Number(a[i]) || 0;
    const valueB = Number(b[i]) || 0;
    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  if (!normA || !normB) {
    return null;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function pickBestChunkScore(chunks, queryEmbedding, documentEmbedding) {
  let bestScore = documentEmbedding ? cosineSimilarity(documentEmbedding, queryEmbedding) : null;
  let bestChunk = null;

  chunks.forEach(chunk => {
    if (!Array.isArray(chunk.embedding)) return;
    const score = cosineSimilarity(chunk.embedding, queryEmbedding);
    if (score === null) return;
    if (bestScore === null || score > bestScore) {
      bestScore = score;
      bestChunk = {
        id: chunk.id,
        content: chunk.content,
        score,
        metadata: chunk.metadata || null
      };
    }
  });

  return { bestChunk, bestScore };
}

class ElasticsearchProvider extends RagProvider {
  constructor(config) {
    super();
    this.client = new Client({
      node: config.node,
      auth: {
        username: config.username,
        password: config.password
      }
    });
  }

  async connect() {
    try {
      const health = await this.client.cluster.health();
      console.log('Elasticsearch connected:', health.status);
      return true;
    } catch (error) {
      console.error('Elasticsearch connection failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  async indexDocument(collection, document, options = {}) {
    const { id, entities, relationships, ...body } = document;
    const prepared = await this.prepareDocumentForIndex(
      {
        ...body,
        entities: entities || [],
        relationships: relationships || []
      },
      { vectorize: options.vectorize !== false }
    );

    await this.client.index({
      index: collection,
      id: id,
      document: prepared,
      refresh: true
    });
  }

  async prepareDocumentForIndex(document, { vectorize = true } = {}) {
    const chunkInput = Array.isArray(document.chunkVectors) && document.chunkVectors.length
      ? document.chunkVectors
      : Array.isArray(document.chunks)
        ? document.chunks
        : [];
    const normalizedChunks = normalizeChunks(chunkInput, document.id);

    if (vectorize) {
      const chunksWithoutEmbeddings = normalizedChunks
        .map((chunk, idx) => (!Array.isArray(chunk.embedding) ? { idx, content: chunk.content } : null))
        .filter(Boolean);

      if (chunksWithoutEmbeddings.length) {
        try {
          const embeddings = await embedTexts(chunksWithoutEmbeddings.map(item => item.content));
          chunksWithoutEmbeddings.forEach((item, embedIdx) => {
            normalizedChunks[item.idx].embedding = embeddings[embedIdx] || null;
          });
        } catch (error) {
          console.error('[ElasticsearchProvider] Chunk embedding generation failed', error.message);
        }
      }
    }

    const documentEmbedding = Array.isArray(document.embedding) && document.embedding.length
      ? document.embedding.map(value => Number(value) || 0)
      : averageEmbedding(normalizedChunks.map(chunk => chunk.embedding).filter(Boolean));

    const sanitizedDocument = { ...document };
    delete sanitizedDocument.chunks;
    delete sanitizedDocument.chunkVectors;

    return {
      ...sanitizedDocument,
      chunkVectors: normalizedChunks,
      embedding: documentEmbedding || null,
      entities: Array.isArray(document.entities) ? document.entities : [],
      relationships: Array.isArray(document.relationships) ? document.relationships : [],
      updatedAt: new Date()
    };
  }

  async search(collection, query, options = {}) {
    const { limit = 5, filters = {}, vector } = options;
    const boolQuery = { must: [] };
    const hasVector = vector && Array.isArray(vector.embedding);
    const candidateCount = hasVector
      ? Math.max(vector.candidateCount || limit * 5, limit)
      : limit;

    if (query) {
      boolQuery.must.push({
        multi_match: {
          query,
          fields: DEFAULT_SEARCH_FIELDS,
          lenient: true
        }
      });
    } else {
      boolQuery.must.push({ match_all: {} });
    }

    if (filters && Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        boolQuery.filter = boolQuery.filter || [];
        if (Array.isArray(value)) {
          const terms = value.filter(item => item !== undefined && item !== null);
          if (terms.length === 0) return;
          const resolvedKey = resolveKeywordField(key, terms);
          boolQuery.filter.push({ terms: { [resolvedKey]: terms } });
          return;
        }
        const resolvedKey = resolveKeywordField(key, value);
        boolQuery.filter.push({ term: { [resolvedKey]: value } });
      });
    }

    const searchParams = {
      index: collection,
      size: candidateCount,
      body: {
        query: { bool: boolQuery }
      }
    };

    if (hasVector) {
      searchParams._source = {
        includes: [
          'title',
          'content',
          'metadata',
          'entities',
          'relationships',
          'chunkVectors',
          'embedding',
          'updatedAt'
        ]
      };
    }

    const result = await this.client.search(searchParams);
    const hits = result.hits?.hits || [];

    if (!hasVector) {
      return hits.map(hit => {
        const source = hit._source || {};
        const chunkVectors = Array.isArray(source.chunkVectors) ? source.chunkVectors : [];
        const sanitizedSource = {
          ...source,
          chunks: sanitizeChunksForOutput(chunkVectors)
        };
        delete sanitizedSource.embedding;
        delete sanitizedSource.chunkVectors;

        return {
          id: hit._id,
          score: hit._score,
          ...sanitizedSource
        };
      });
    }

    return this.reRankWithEmbeddings(hits, vector, limit);
  }

  reRankWithEmbeddings(hits, vectorOptions, limit) {
    const queryEmbedding = vectorOptions.embedding;
    const mode = vectorOptions.mode || 'vector';
    const textScores = hits.map(hit => hit._score || 0);
    const maxTextScore = Math.max(...textScores, 0);
    const vectorWeight = mode === 'hybrid' ? vectorOptions.vectorWeight ?? 0.7 : 1;
    const textWeight = mode === 'hybrid' ? vectorOptions.textWeight ?? 0.3 : 0;

    const rescored = hits
      .map(hit => {
        const source = hit._source || {};
        const chunkVectors = Array.isArray(source.chunkVectors) ? source.chunkVectors : [];
        const sanitizedChunks = sanitizeChunksForOutput(chunkVectors);
        const { bestChunk, bestScore } = pickBestChunkScore(chunkVectors, queryEmbedding, source.embedding);
        const vectorScore = bestScore ?? null;
        const normalizedVector = vectorScore !== null ? (vectorScore + 1) / 2 : 0;
        const normalizedText = maxTextScore > 0 ? (hit._score || 0) / maxTextScore : 0;
        const hybridScore = vectorWeight * normalizedVector + textWeight * normalizedText;

        const doc = {
          id: hit._id,
          ...source,
          chunks: sanitizedChunks
        };
        delete doc.embedding;
        delete doc.chunkVectors;

        return {
          ...doc,
          textScore: hit._score || null,
          vectorScore,
          hybridScore,
          bestChunk
        };
      })
      .sort((a, b) => (b.hybridScore ?? 0) - (a.hybridScore ?? 0));

    return rescored.slice(0, limit);
  }

  async deleteDocument(collection, id) {
    try {
      await this.client.delete({
        index: collection,
        id
      });
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return;
      }
      throw error;
    }
  }

  async getDocument(collection, id) {
    try {
      const response = await this.client.get({ index: collection, id });
      const source = response._source || {};
      return {
        id: response._id,
        ...source
      };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}

module.exports = ElasticsearchProvider;
